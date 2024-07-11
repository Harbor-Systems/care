import { Typography } from '@mui/material';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorDialog, PageForm, safelyCaptureException } from 'ottehr-components';
import {
  PatientInfo,
  PersonSex,
  ageIsInRange,
  getSelectors,
  mdyStringFromISOString,
  yupDateTransform,
} from 'ottehr-utils';
import { IntakeFlowPageRoute } from '../App';
import { otherColors } from '../IntakeThemeProvider';
import { useAppointmentStore, useCreateAppointmentMutation } from '../features/appointments';
import { CustomContainer } from '../features/common';
import { useFilesStore } from '../features/files';
import { useGetPaperwork, usePaperworkStore } from '../features/paperwork';
import { usePatientInfoStore } from '../features/patient-info';
import { MAXIMUM_AGE, MINIMUM_AGE, useZapEHRAPIClient } from '../utils';
import { useTranslation } from 'react-i18next';

const PatientInformation = (): JSX.Element => {
  const { t } = useTranslation();
  const apiClient = useZapEHRAPIClient();
  const [getPaperworkEnabled, setGetPaperworkEnabled] = useState(false);
  const createAppointment = useCreateAppointmentMutation();
  const getPaperworkQuery = useGetPaperwork(
    (data) => {
      paperworkState.patchCompletedPaperwork(data.paperwork);
      paperworkState.setQuestions(data.questions);
      useFilesStore.setState({ fileURLs: data.files });
      navigate(`/paperwork/${data.questions[0].slug}`);
    },
    { staleTime: 0, enabled: getPaperworkEnabled },
  );
  const navigate = useNavigate();
  const [ageErrorDialogOpen, setAgeErrorDialogOpen] = useState<boolean>(false);
  const { patientInfo } = getSelectors(usePatientInfoStore, ['patientInfo']);
  const paperworkState = getSelectors(usePaperworkStore, ['patchCompletedPaperwork', 'setQuestions']);

  useEffect(() => {
    //mixpanel.track('Patient Information page opened');
  }, []);

  const onSubmit = async (data: PatientInfo): Promise<void> => {
    // Store DOB in yyyy-mm-dd format for backend validation
    const dateOfBirth = mdyStringFromISOString(data.dateOfBirth || patientInfo.dateOfBirth || '');
    data.dateOfBirth = dateOfBirth || 'Unknown';

    if (!ageIsInRange(dateOfBirth ?? '', MINIMUM_AGE, MAXIMUM_AGE).result) {
      setAgeErrorDialogOpen(true);
      return;
    }

    const paperwork: any = {};
    if (data.emailUser === 'Patient') {
      paperwork['patient-email'] = data.email;
    }
    if (data.emailUser === 'Parent/Guardian') {
      paperwork['guardian-email'] = data.email;
    }

    paperworkState.patchCompletedPaperwork(paperwork);

    data.id = patientInfo.id === 'new-patient' ? undefined : patientInfo.id;

    if (patientInfo.id === 'new-patient') {
      data.newPatient = patientInfo.newPatient;
    }

    usePatientInfoStore.setState(() => ({ patientInfo: data }));

    if (patientInfo.id !== 'new-patient') {
      navigate(IntakeFlowPageRoute.ConfirmDateOfBirth.path);
      return;
    }

    if (!apiClient) {
      throw new Error('apiClient is not defined');
    }

    createAppointment.mutate(
      { apiClient },
      {
        onSuccess: async (response) => {
          useAppointmentStore.setState(() => ({ appointmentID: response.appointmentId }));
          if (response.fhirPatientId) {
            usePatientInfoStore.setState((state) => ({
              patientInfo: { ...state.patientInfo, id: response.fhirPatientId },
            }));
          }
          setGetPaperworkEnabled(true);
        },
        onError: (error) => {
          safelyCaptureException(error);
        },
      },
    );
  };

  const formattedBirthday = DateTime.fromFormat(yupDateTransform(patientInfo.dateOfBirth) || '', 'yyyy-MM-dd').toFormat(
    'dd MMMM, yyyy',
  );

  return (
    <CustomContainer
      title={t('patientInfo.title')}
      description={t('patientInfo.description')}
      bgVariant={IntakeFlowPageRoute.PatientInformation.path}
    >
      {!patientInfo.newPatient && (
        <>
          <Typography variant="h3" color="secondary.main">
            {patientInfo.firstName} {patientInfo.lastName}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '14px' }} color="secondary.main">
            Birthday: {formattedBirthday || patientInfo.dateOfBirth}
          </Typography>
          <Typography variant="body1" color={otherColors.wrongPatient} marginTop={2} marginBottom={4}>
            Wrong patient? Please{' '}
            <Link style={{ color: otherColors.wrongPatient }} to={IntakeFlowPageRoute.Homepage.path}>
              go back
            </Link>{' '}
            for a new patient or different existing patient record.
          </Typography>
        </>
      )}
      <PageForm
        formElements={[
          {
            type: 'Text',
            name: 'firstName',
            label: t('patientInfo.formElement.labels.firstName'),
            placeholder: 'First name',
            defaultValue: patientInfo.firstName,
            required: patientInfo.newPatient,
            width: 6,
            hidden: !patientInfo.newPatient,
          },
          {
            type: 'Text',
            name: 'lastName',
            label: t('patientInfo.formElement.labels.lastName'),
            placeholder: 'Last name',
            defaultValue: patientInfo.lastName,
            required: patientInfo.newPatient,
            width: 6,
            hidden: !patientInfo.newPatient,
          },
          {
            type: 'Date',
            name: 'dateOfBirth',
            label: t('patientInfo.formElement.labels.dateOfBirth'),
            defaultValue: patientInfo.dateOfBirth,
            required: patientInfo.newPatient,
            hidden: !patientInfo.newPatient,
          },
          {
            type: 'Select',
            name: 'sex',
            label: t('patientInfo.formElement.labels.sex'),
            defaultValue: patientInfo.sex,
            required: true,
            infoTextSecondary:
              'Our care team uses this to inform treatment recommendations and share helpful information regarding potential medication side effects, as necessary.',
            selectOptions: Object.entries(PersonSex).map(([key, value]) => {
              return {
                label: key,
                value: value,
              };
            }),
          },
          {
            type: 'Text',
            name: 'email',
            label: 'Email',
            format: 'Email',
            defaultValue: patientInfo.email,
            required: true,
          },
          {
            type: 'Radio List',
            name: 'emailUser',
            label: 'This email belongs to',
            defaultValue: patientInfo.emailUser || 'Parent/Guardian',
            required: true,
            radioOptions: [
              {
                label: 'Parent/Guardian',
                value: 'Parent/Guardian',
              },
              {
                label: 'Patient',
                value: 'Patient',
              },
            ],
          },
        ]}
        controlButtons={{
          loading: createAppointment.isLoading || getPaperworkQuery.isLoading,
          submitLabel: 'Continue',
        }}
        onSubmit={onSubmit}
      />
      <ErrorDialog
        open={ageErrorDialogOpen}
        title="Age not in range"
        description="These services are only available for patients between the ages of 0 and 26."
        closeButtonText="Close"
        handleClose={() => setAgeErrorDialogOpen(false)}
      />
    </CustomContainer>
  );
};

export default PatientInformation;
