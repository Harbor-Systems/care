import { DateTime } from 'luxon';
import { useMutation, useQuery } from 'react-query';
import { ZapEHRAPIClient } from 'ottehr-components';
import { usePatientInfoStore } from '../patient-info';
import { useAppointmentStore } from './appointment.store';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useCreateAppointmentMutation = () =>
  useMutation({
    mutationFn: ({
      apiClient,
      unconfirmedDateOfBirth,
    }: {
      apiClient: ZapEHRAPIClient;
      unconfirmedDateOfBirth?: string;
    }) => {
      // const appointment = AppointmentStore.getState();
      const patientInfo = usePatientInfoStore.getState();
      const appointment = useAppointmentStore.getState();

      return apiClient.createAppointment({
        // slot: intakeCommon.visitType === VisitType.WalkIn ? undefined : appointment.appointmentSlot,
        patient: patientInfo.patientInfo,
        timezone: DateTime.now().zoneName,
        locationID: appointment.locationID,
        providerID: appointment.providerID,
        groupID: appointment.groupID,
        slot: appointment.visitType === 'prebook' ? appointment.selectedSlot : undefined,
        scheduleType: appointment.scheduleType,
        visitType: appointment.visitType,
        visitService: appointment.visitService,
        ...(unconfirmedDateOfBirth && { unconfirmedDateOfBirth }),
      });
    },
  });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useCancelAppointmentMutation = () =>
  useMutation({
    mutationFn: ({
      apiClient,
      appointmentID,
      cancellationReason,
    }: {
      apiClient: ZapEHRAPIClient;
      appointmentID: string;
      cancellationReason: string;
    }) => {
      return apiClient.cancelAppointment({
        appointmentID,
        cancellationReason,
      });
    },
  });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useGetAppointments = (apiClient: ZapEHRAPIClient | null, enabled = true, patientId?: string) =>
  useQuery(
    ['appointments', patientId],
    () => {
      if (!apiClient) {
        throw new Error('API client not defined');
      }
      return patientId ? apiClient.getAppointments({ patientId }) : apiClient.getAppointments();
    },
    {
      enabled,
      onError: (err) => {
        console.error('Error during fetching appointments: ', err);
      },
      staleTime: 1000 * 60 * 5,
    },
  );

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useGetSchedule = (apiClient: ZapEHRAPIClient | null, scheduleType: string, slug: string, enabled = true) =>
  useQuery(
    ['schedule'],
    async () => {
      if (!apiClient) {
        throw new Error('API client not defined');
      }
      let response;
      try {
        response = await apiClient.getSchedule({ scheduleType, slug });
      } catch (error: any) {
        if (error.message === 'Schedule is not found') {
          return undefined;
        }
        throw error;
      }
      return response;
    },
    {
      enabled,
      onError: (error: any) => {
        console.error('Error getting a schedule: ', error);
      },
      retry: (failureCount, error: any) => {
        if (error.message === 'Schedule is not found') {
          return false;
        }
        return failureCount < 1;
      },
    },
  );
