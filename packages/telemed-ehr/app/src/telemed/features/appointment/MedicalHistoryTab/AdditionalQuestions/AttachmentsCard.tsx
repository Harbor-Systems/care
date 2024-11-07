import React, { FC, useState } from 'react';
import { Box, Button, Divider, Skeleton, Typography } from '@mui/material';
import { getSelectors } from '../../../../../shared/store/getSelectors';
import { useAppointmentStore } from '../../../../state';
import { AttachmentPreSigned, usePreSignedAttachmentFiles } from '../../../../hooks';
import { ExcuseLink } from '../../PlanTab';

const useAttachments = (
  attachmentTitle: string,
): { preSignedAttachment: AttachmentPreSigned | undefined; isLoading: boolean } => {
  const { attachments } = getSelectors(useAppointmentStore, ['attachments']);

  const attachment = attachments.find((attachment) => attachment.title === attachmentTitle);
  return usePreSignedAttachmentFiles(attachment);
};

interface AttachmentsCardProps {
  attachmentTitle: string;
}
export const AttachmentsCard = ({ attachmentTitle }: AttachmentsCardProps): JSX.Element => {
  const { preSignedAttachment, isLoading } = useAttachments(attachmentTitle);

  return isLoading ? (
    <Skeleton variant="rectangular" width="100%" />
  ) : preSignedAttachment ? (
    <ExcuseLink
      label={preSignedAttachment.title!}
      to={preSignedAttachment.preSignedUrl!}
      onDelete={undefined}
      disabled={false}
    />
  ) : (
    <Typography>Attachment not found</Typography>
  );
};
