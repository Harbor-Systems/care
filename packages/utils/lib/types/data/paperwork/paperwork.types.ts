import { FileURLs } from '../../common';
import { PaperworkResponse } from '../paperwork.types';

export interface UpdatePaperworkInput {
  appointmentID: string;
  paperworkIdentifier: string | undefined;
  paperwork?: PaperworkResponse[];
  inProgress?: string;
  files: FileURLs;
  timezone: string;
}

export interface UpdatePaperworkResponse {
  message: string;
}
