import { Button, Typography } from '@mui/material';
import { Box } from '@mui/system';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IntakeFlowPageRoute } from '../App';
// import { clockFullColor } from '../assets/icons';
import { useAppointmentStore, useGetSchedule } from '../features/appointments';
import { CustomContainer } from '../features/common';
import { useZapEHRAPIClient } from '../utils';
import Schedule from '../components/Schedule';
import { ErrorDialog } from 'ottehr-components';

interface Parameters {
  'schedule-type': 'location' | 'provider';
  slug: string;
  'visit-type': 'prebook' | 'now';
  'visit-service': 'in-person' | 'telemedicine';
}

const Welcome = (): JSX.Element => {
  const navigate = useNavigate();
  const apiClient = useZapEHRAPIClient({ tokenless: true });
  const parameters = useParams<keyof Parameters>() as Parameters;
  const { 'schedule-type': scheduleType, slug, 'visit-type': visitType, 'visit-service': visitService } = parameters;
  const [choiceErrorDialogOpen, setChoiceErrorDialogOpen] = useState(false);
  const { selectedSlot, setAppointment } = useAppointmentStore((state) => state);
  const { t } = useTranslation();

  if (!slug) {
    throw new Error('slug is not defined');
  }
  if (!scheduleType) {
    throw new Error('schedule-type is not defined');
  }

  const { data: schedule, isFetching, isError } = useGetSchedule(apiClient, scheduleType, slug, Boolean(apiClient));

  useEffect(() => {
    setAppointment({ scheduleType, visitType, visitService });
    if (visitType === 'now') {
      setAppointment({ selectedSlot: DateTime.now().toISO() });
    }
  }, [visitService, setAppointment, visitType, scheduleType]);

  useEffect(() => {
    setAppointment({ locationID: schedule?.locationID, providerID: schedule?.providerID, groupID: schedule?.groupID });
  }, [schedule?.groupID, schedule?.locationID, schedule?.providerID, setAppointment]);

  const onSubmit = (): void => {
    if (!selectedSlot) {
      setChoiceErrorDialogOpen(true);
    } else {
      navigate(IntakeFlowPageRoute.AuthPage.path);
    }
  };

  return (
    <CustomContainer
      title={t('welcome.title')}
      subtitle={isFetching ? 'Loading...' : schedule?.name}
      // img={clockFullColor}
      // imgAlt="Clock icon"
      imgWidth={120}
      bgVariant={IntakeFlowPageRoute.NewUser.path}
      isFirstPage={true}
    >
      {isFetching && <Typography variant="body1">Loading...</Typography>}
      {!isFetching && !isError && !schedule && (
        <Typography variant="body1">The schedule &quot;{slug}&quot; is not found</Typography>
      )}
      {schedule && !schedule.available && (
        <Typography variant="body1">The schedule &quot;{slug}&quot; is not available</Typography>
      )}
      {schedule && !['in-person', 'telemedicine'].includes(visitService || '') && (
        <Typography variant="body1">The service &quot;{visitService}&quot; is not available</Typography>
      )}
      {isError && (
        <Typography variant="body1">
          There was an error getting the schedule. Please refresh and if you still get errors contact us.
        </Typography>
      )}
      {!isFetching && schedule && schedule.available && ['in-person', 'telemedicine'].includes(visitService || '') && (
        <>
          <Typography variant="body1">{t('welcome.subtext')}</Typography>
          <div dangerouslySetInnerHTML={{ __html: t('welcome.html') }} />
          {visitType === 'prebook' && <Schedule slotData={schedule.availableSlots} timezone={'America/New_York'} />}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              className="next-button"
              type="submit"
              sx={{
                mt: 2,
              }}
              onClick={onSubmit}
            >
              Continue
            </Button>
          </Box>
        </>
      )}
      <ErrorDialog
        open={choiceErrorDialogOpen}
        title="Please select a date and time"
        description="To continue, please select an available appointment."
        closeButtonText="Close"
        handleClose={() => setChoiceErrorDialogOpen(false)}
      />
    </CustomContainer>
  );
};

export default Welcome;
