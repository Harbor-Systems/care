import { Patient } from 'fhir/r4';
import { getFullName, getPatientFirstName, getSecret, Secrets, SecretsKeys } from '../../../../../utils';
import { getPatientContactEmail } from '../../appointment/create-appointment';

export const createICSContent = (
  startTime: string,
  timezone: string,
  patient: Patient,
  location: string,
  secrets: Secrets | null,
  durationMinutes: number = 15,
): string => {
  const formatDate = (date: string): string => {
    const splitDate = date.replace(/[-:]|(\.\d{3})/g, '').split('T');
    const last = splitDate.pop()?.slice(0, 6) || '000000';
    return splitDate.join('T') + 'T' + last;
  };

  let inviteeEmail;
  try {
    inviteeEmail = getSecret(SecretsKeys.TELEMED_SENDGRID_EMAIL_BCC, secrets);
  } catch (e) {
    /* empty */
  }
  const patientContactEmail = getPatientContactEmail(patient);

  return `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:${new Date().getTime()}
DTSTAMP;TZID=${timezone}:${formatDate(new Date().toISOString())}
DTSTART;TZID=${timezone}:${formatDate(startTime)}
DURATION:PT${durationMinutes}M
SUMMARY:Appointment
DESCRIPTION:Appointment for ${getPatientFirstName(patient)}
LOCATION:${location}${
    patientContactEmail
      ? `
ATTENDEE;RSVP=FALSE;ROLE=REQ-PARTICIPANT;CN=${getFullName(patient)}:mailto:${patientContactEmail}`
      : ''
  }${
    inviteeEmail
      ? `
ATTENDEE;RSVP=FALSE;ROLE=REQ-PARTICIPANT;CN=${inviteeEmail}:mailto:${inviteeEmail}`
      : ''
  }
END:VEVENT
END:VCALENDAR`;
};
