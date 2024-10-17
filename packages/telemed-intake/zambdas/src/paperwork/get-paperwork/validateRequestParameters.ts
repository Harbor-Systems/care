import { ZambdaInput } from 'ottehr-utils';
import { GetPaperworkInput } from '.';

export function validateRequestParameters(input: ZambdaInput): GetPaperworkInput {
  if (!input.body) {
    throw new Error('No request body provided');
  }

  const { appointmentID, paperworkIdentifier } = JSON.parse(input.body);

  if (!appointmentID) {
    throw new Error('appointmentID is not defined');
  }

  const authorization = input.headers.Authorization;

  return {
    appointmentID,
    paperworkIdentifier: paperworkIdentifier,
    secrets: input.secrets,
    authorization,
  };
}
