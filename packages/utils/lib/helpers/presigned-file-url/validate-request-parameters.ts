import {
  INSURANCE_CARD_BACK_ID,
  INSURANCE_CARD_FRONT_ID,
  PATIENT_PHOTO_ID_PREFIX,
  PHOTO_ID_BACK_ID,
  PHOTO_ID_FRONT_ID,
  SCHOOL_WORK_NOTE_BOTH_ID,
  SCHOOL_WORK_NOTE_BOTH_ID2,
  SCHOOL_WORK_NOTE_SCHOOL_ID,
  SCHOOL_WORK_NOTE_WORK_ID,
  ZambdaInput,
} from '../../types';
import { GetPresignedFileURLInput } from './types';
import {getSecret, SecretsKeys} from "../../secrets";

const defaultFileTypes = [
  INSURANCE_CARD_BACK_ID,
  INSURANCE_CARD_FRONT_ID,
  PHOTO_ID_FRONT_ID,
  PHOTO_ID_BACK_ID,
  SCHOOL_WORK_NOTE_SCHOOL_ID,
  SCHOOL_WORK_NOTE_WORK_ID,
  SCHOOL_WORK_NOTE_BOTH_ID,
  SCHOOL_WORK_NOTE_BOTH_ID2,
];
const fileFormats = ['jpg', 'jpeg', 'png', 'pdf'];

export function validateRequestParameters(input: ZambdaInput): GetPresignedFileURLInput {
  if (!input.body) {
    throw new Error('No request body provided');
  }

  const { appointmentID, fileType, fileFormat } = JSON.parse(input.body);

  if (appointmentID === undefined || appointmentID === '') {
    throw new Error('"appointmentID" is required');
  }

  if (fileType === undefined || fileType === '') {
    throw new Error('"fileType" is required');
  }

  let customFileTypes: string[];
  try {
    customFileTypes = getSecret(SecretsKeys.ALLOWED_FILE_TYPES, input.secrets).split(',');
  } catch (e) {
    customFileTypes = [];
  }

  const fileTypes = defaultFileTypes.concat(customFileTypes)
  if (!(fileTypes.concat(customFileTypes)).includes(fileType) && !fileType.startsWith(PATIENT_PHOTO_ID_PREFIX)) {
    throw new Error(`fileType must be one of the following values: ${Object.values(fileTypes).join(', ')}`);
  }

  if (fileFormat === undefined || fileFormat === '') {
    throw new Error('"fileFormat" is required');
  }

  if (!fileFormats.includes(fileFormat.toLowerCase())) {
    throw new Error(
      `fileFormat ${fileFormat} must be one of the following values: ${Object.values(fileFormats).join(', ')}`,
    );
  }

  return {
    appointmentID,
    fileType,
    fileFormat: fileFormat.toLowerCase(),
    secrets: input.secrets,
  };
}
