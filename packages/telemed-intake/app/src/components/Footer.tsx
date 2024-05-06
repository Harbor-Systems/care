import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Box, Typography } from '@mui/material';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { QuestionMarkButton } from 'ottehr-components';
import { otherColors } from '../IntakeThemeProvider';

const Footer: FC = () => {
  const { t } = useTranslation();

  return (
    <Box sx={{ position: 'sticky', bottom: 0, pointerEvents: 'none' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '16px',
          pointerEvents: 'all',
          marginLeft: 'auto',
          width: 'fit-content',
        }}
      >
        <QuestionMarkButton url={'https://ottehr.com'} />
      </Box>
      <Box
        sx={{
          width: '100%',
          backgroundColor: 'secondary.main',
          color: 'primary.contrast',
          bottom: 0,
        }}
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <ErrorOutlineIcon color="inherit" sx={{ pl: 1.25, marginTop: '10px', marginBottom: 'auto' }} />
        <Typography variant="body2" color={otherColors.white} sx={{ m: 1.25, maxWidth: 850 }}>
          {t('general.footer')}
        </Typography>
      </Box>
    </Box>
  );
};
export default Footer;
