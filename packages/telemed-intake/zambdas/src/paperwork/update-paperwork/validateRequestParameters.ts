import { Questionnaire } from 'fhir/r4';
import {
  PHOTO_ID_BACK_ID,
  PHOTO_ID_FRONT_ID,
  PaperworkResponse,
  UpdatePaperworkInput,
  ZambdaInput,
  dateRegex,
  emailRegex,
  parseFiletype,
  phoneRegex,
  questionnaireItemToInputType,
  zipRegex,
} from 'ottehr-utils';

function checkEnable(item: any, values: any): boolean {
  if (item.hidden && !item.enableWhen) {
    return false;
  }

  if (item.enableWhen) {
    const value = values[item.enableWhen.question];
    // console.log(item.name, item.enableWhen.answer, value);
    if (item.enableWhen.operator === '=') {
      const test = value === item.enableWhen.answer;
      if (!test) {
        item.hidden = true;
      }
      return test;
    }
  }

  return true;
}

export function validateUpdatePaperworkParams(
  input: ZambdaInput,
  questionnaire: Questionnaire,
): UpdatePaperworkInput & { ipAddress: string; paperwork: PaperworkResponse[] } {
  if (!input.body) {
    throw new Error('No request body provided');
  }

  const inputJSON = JSON.parse(input.body);
  const { appointmentID, paperworkIdentifier, paperwork, files, timezone } = inputJSON;

  const responses: PaperworkResponse[] = [];

  paperwork &&
    questionnaire.item?.forEach((pageTemp) => {
      const pageItems = pageTemp.item;
      pageItems?.forEach((itemTemp) => {
        const questionnaireItemInputTemp = questionnaireItemToInputType(itemTemp);
        if (
          questionnaireItemInputTemp.type === 'Description' ||
          questionnaireItemInputTemp.type === 'Header 3' ||
          questionnaireItemInputTemp.type === 'Photos'
        ) {
          return;
        }

        if (!checkEnable(questionnaireItemInputTemp, paperwork)) {
          return;
        }

        let paperworkItemValueTemp = null;
        if (
          questionnaireItemInputTemp.format === 'Email' ||
          questionnaireItemInputTemp.format === 'ZIP' ||
          questionnaireItemInputTemp.format === 'Phone Number'
        ) {
          paperworkItemValueTemp = paperwork[itemTemp.linkId]?.trim();
        } else {
          paperworkItemValueTemp = paperwork[itemTemp.linkId];
        }

        let responseType = 'text';

        if (paperworkItemValueTemp) {
          if (questionnaireItemInputTemp.format === 'ZIP' && !zipRegex.test(paperworkItemValueTemp)) {
            throw new Error(
              `Error: Input ${itemTemp.linkId} with value "${paperworkItemValueTemp}" may not be a valid ZIP code`,
            );
          }

          if (questionnaireItemInputTemp.format === 'Phone Number' && !phoneRegex.test(paperworkItemValueTemp)) {
            throw new Error(
              `Error: Input ${itemTemp.linkId} with value "${paperworkItemValueTemp}" may not be a valid phone number`,
            );
          }

          if (questionnaireItemInputTemp.format === 'Email' && !emailRegex.test(paperworkItemValueTemp)) {
            throw new Error(
              `Error: Input ${itemTemp.linkId} with value "${paperworkItemValueTemp}" may not be a valid email`,
            );
          }

          if (itemTemp.type === 'choice') {
            const options = itemTemp.answerOption?.map((itemTemp) => itemTemp.valueString);
            if (questionnaireItemInputTemp.type === 'Free Select') {
              paperworkItemValueTemp.map((value: string) => {
                if (!options?.includes(value)) {
                  throw new Error(
                    `Error: Input ${
                      itemTemp.linkId
                    } with value "${value}" is not in the accepted list of values ${JSON.stringify(options)}`,
                  );
                }
              });
              paperworkItemValueTemp = paperworkItemValueTemp.join(',');
            } else {
              if (!options?.includes(paperworkItemValueTemp)) {
                throw new Error(
                  `Error: Input ${
                    itemTemp.linkId
                  } with value "${paperworkItemValueTemp}" is not in the accepted list of values ${JSON.stringify(
                    options,
                  )}`,
                );
              }
            }
          } else if (itemTemp.type === 'date') {
            if (!dateRegex.test(paperworkItemValueTemp)) {
              throw new Error(
                `Error: Input ${itemTemp.linkId} with value "${paperworkItemValueTemp}" may not be a valid date`,
              );
            }
            responseType = 'date';
          } else if (itemTemp.type === 'boolean') {
            const boolsThatMustBeTrue = ['hipaa-acknowledgement', 'consent-to-treat'];
            if (boolsThatMustBeTrue.includes(itemTemp.linkId) && paperworkItemValueTemp !== true) {
              throw new Error(
                `Error: Input ${itemTemp.linkId} value with value "${paperworkItemValueTemp}" must be true`,
              );
            }
            responseType = 'boolean';
          } else if (questionnaireItemInputTemp.type === 'Form list') {
            if (!paperworkItemValueTemp && itemTemp.required) {
              throw new Error(
                `Error: Input ${itemTemp.linkId} value with value "${paperworkItemValueTemp}" must be list of values`,
              );
            }
            responseType = 'form-list';
          }

          responses.push({
            linkId: itemTemp.linkId,
            response: paperworkItemValueTemp,
            type: responseType,
          });
        }
      });
    });

  // console.log(
  //   `isContactInformationComplete ${isContactInformationComplete(
  //     paperwork
  //   )}\nisPatientDetailsComplete ${isPatientDetailsComplete(
  //     paperwork
  //   )}\nisPrimaryCarePhysicianComplete ${isPrimaryCarePhysicianComplete(
  //     paperwork
  //   )}\nisCurrentMedicationsComplete ${isCurrentMedicationsComplete(
  //     paperwork
  //   )}\nisAllergiesComplete ${isAllergiesComplete(paperwork)}\nisMedicalHistoryComplete ${isMedicalHistoryComplete(
  //     paperwork
  //   )}\nisSurgicalHistoryComplete ${isSurgicalHistoryComplete(
  //     paperwork
  //   )}\nisAdditionalQuestionsComplete ${isAdditionalQuestionsComplete(
  //     paperwork
  //   )}\nisPaymentOptionComplete ${isPaymentOptionComplete(
  //     paperwork
  //   )}\nisResponsiblePartyComplete ${isResponsiblePartyComplete(paperwork)}\nisPhotoIdComplete ${isPhotoIdComplete(
  //     files
  //   )}\nisConsentFormsComplete ${isConsentFormsComplete(paperwork)}`
  // );

  const filesArr = Object.keys(files || {}).map((key: any) => files[key].z3Url);

  filesArr.forEach((cardUrl: any) => {
    const fileType = cardUrl && parseFiletype(cardUrl);
    if (fileType && fileType !== 'png' && fileType !== 'jpg' && fileType !== 'jpeg') {
      throw new Error('Unsupported file type. File type must be one of: "png", "jpg", "jpeg"');
    }
  });

  let ipAddress = '';
  const environment = process.env.ENVIRONMENT || input.secrets?.ENVIRONMENT;
  console.log('Environment: ', environment);
  switch (environment) {
    case 'local':
      ipAddress = input?.requestContext?.identity?.sourceIp ? input.requestContext.identity.sourceIp : 'Unknown';
      break;
    case 'dev':
    case 'testing':
    case 'staging':
    case 'production':
      ipAddress = input?.headers?.['cf-connecting-ip'] ? input.headers['cf-connecting-ip'] : 'Unknown';
      break;
    default:
      ipAddress = 'Unknown';
  }

  return {
    appointmentID,
    paperworkIdentifier: paperworkIdentifier,
    timezone,
    paperwork: responses,
    files,
    ipAddress,
  };
}

function valueExists(value: any): boolean {
  return value !== undefined && value !== '';
}

function isContactInformationComplete(paperwork: Record<string, any> | undefined): boolean {
  if (!paperwork) return false;
  const address =
    valueExists(paperwork['patient-street-address']) &&
    valueExists(paperwork['patient-city']) &&
    valueExists(paperwork['patient-state']) &&
    valueExists(paperwork['patient-zip']);
  const patientFillingOutAs = valueExists(paperwork['patient-filling-out-as']);
  const patientInfoExists = valueExists(paperwork['patient-email']) && valueExists(paperwork['patient-number']);
  const guardianInfoExists = valueExists(paperwork['guardian-email']) && valueExists(paperwork['guardian-number']);

  return address && patientFillingOutAs && (patientInfoExists || guardianInfoExists);
}

function isPatientDetailsComplete(paperwork: Record<string, any> | undefined): boolean {
  if (!paperwork) return false;
  const pointOfDiscovery = paperwork['patient-point-of-discovery'];
  const pointOfDiscoveryValid = pointOfDiscovery === undefined || pointOfDiscovery !== '';
  return pointOfDiscoveryValid && valueExists(paperwork['patient-birth-sex']);
}

function isPrimaryCarePhysicianComplete(paperwork: Record<string, any> | undefined): boolean {
  if (!paperwork) return false;
  const pcp =
    valueExists(paperwork['pcp-first']) &&
    valueExists(paperwork['pcp-last']) &&
    valueExists(paperwork['pcp-practice']) &&
    valueExists(paperwork['pcp-number']) &&
    valueExists(paperwork['fax-number']) &&
    valueExists(paperwork['pcp-address']);
  return pcp;
}

function isCurrentMedicationsComplete(paperwork: Record<string, any> | undefined): boolean {
  if (!paperwork) return false;
  const yesNo = paperwork['current-medications-yes-no'] === 'Patient does not take any medications currently';
  const valuesArray = valueExists(paperwork['current-medications']);
  return yesNo || valuesArray;
}

function isAllergiesComplete(paperwork: Record<string, any> | undefined): boolean {
  if (!paperwork) return false;
  const yesNo = paperwork['allergies-yes-no'] === 'Patient has no allergies';
  const valuesArray = valueExists(paperwork['allergies']);
  return yesNo || valuesArray;
}

function isMedicalHistoryComplete(paperwork: Record<string, any> | undefined): boolean {
  if (!paperwork) return false;
  const yesNo = paperwork['medical-history-yes-no'] === 'Patient has no medical conditions';
  const valuesArray = valueExists(paperwork['medical-history']);
  return yesNo || valuesArray;
}

function isSurgicalHistoryComplete(paperwork: Record<string, any> | undefined): boolean {
  if (!paperwork) return false;
  const yesNo = paperwork['surgical-history-yes-no'] === "Patient doesn't have surgical history";
  const valuesArray = valueExists(paperwork['surgical-history']);
  return yesNo || valuesArray;
}

function isAdditionalQuestionsComplete(paperwork: Record<string, any> | undefined): boolean {
  if (!paperwork) return false;
  const questions =
    valueExists(paperwork['flu-vaccine']) &&
    valueExists(paperwork['vaccines-up-to-date']) &&
    valueExists(paperwork['travel-usa']) &&
    valueExists(paperwork['hospitalize']);
  return questions;
}

function isPaymentOptionComplete(paperwork: Record<string, any> | undefined): boolean {
  if (!paperwork) return false;
  const noInsurance = paperwork['payment-option'] === 'I will pay without insurance';
  const insurance =
    valueExists(paperwork['insurance-carrier']) &&
    valueExists(paperwork['insurance-member-id']) &&
    valueExists(paperwork['policy-holder-first-name']) &&
    valueExists(paperwork['policy-holder-last-name']) &&
    valueExists(paperwork['policy-holder-date-of-birth']) &&
    valueExists(paperwork['policy-holder-birth-sex']) &&
    valueExists(paperwork['patient-relationship-to-insured']);
  return noInsurance || insurance;
}

function isResponsiblePartyComplete(paperwork: Record<string, any> | undefined): boolean {
  if (!paperwork) return false;
  return (
    valueExists(paperwork['responsible-party-relationship']) &&
    valueExists(paperwork['responsible-party-first-name']) &&
    valueExists(paperwork['responsible-party-last-name']) &&
    valueExists(paperwork['responsible-party-date-of-birth']) &&
    valueExists(paperwork['responsible-party-birth-sex'])
  );
}

function isPhotoIdComplete(files: any): boolean {
  return valueExists(files[PHOTO_ID_FRONT_ID]?.z3Url) && valueExists(files[PHOTO_ID_BACK_ID]?.z3Url);
}

function isConsentFormsComplete(paperwork: Record<string, any> | undefined): boolean {
  if (!paperwork) return false;
  return (
    paperwork['hipaa-acknowledgement'] === true &&
    paperwork['consent-to-treat'] === true &&
    valueExists(paperwork['signature']) &&
    valueExists(paperwork['full-name']) &&
    valueExists(paperwork['consent-form-signer-relationship'])
  );
}
