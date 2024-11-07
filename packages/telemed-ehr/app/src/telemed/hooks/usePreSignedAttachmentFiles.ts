import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useAppointmentStore } from '../state';
import { getPresignedFileUrl } from '../../helpers/files.helper';
import { getSelectors } from '../../shared/store/getSelectors';
import { Attachment } from 'fhir/r4';

export type AttachmentPreSigned = Attachment & { preSignedUrl?: string };

export const usePreSignedAttachmentFiles = (
  attachment: Attachment | undefined,
): {
  preSignedAttachment: AttachmentPreSigned | undefined;
  isLoading: boolean;
} => {
  const { getAccessTokenSilently } = useAuth0();
  const [preSignedAttachment, setPreSignedAttachment] = useState<AttachmentPreSigned>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function getPresignedTemplateUrls(): Promise<void> {
      setIsLoading(true);
      try {
        const authToken = await getAccessTokenSilently();

        if (attachment!.url) {
          const preSignedUrl = await getPresignedFileUrl(attachment!.url, authToken);
          if (preSignedUrl) {
            setPreSignedAttachment({ ...attachment, preSignedUrl });
          }
        }

        setIsLoading(false);
      } catch {
        console.error('Error while trying to get template presigned urls');
        setIsLoading(false);
      }
    }

    if (attachment) {
      void getPresignedTemplateUrls();
    }
  }, [getAccessTokenSilently, attachment]);

  return { preSignedAttachment, isLoading };
};
