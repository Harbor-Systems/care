import { FC } from 'react';

type CustomRadioIconProps = {
  color: string;
  alt: string;
};

const CustomRadioButtonIcon: FC<CustomRadioIconProps> = ({ color, alt }: CustomRadioIconProps): JSX.Element => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label={alt}>
    <rect x="0.5" y="0.5" width="17" height="17" rx="8.5" fill="white" stroke={color} />
    <circle cx="4" cy="4" r="3.5" transform="matrix(-1 0 0 1 13 5)" fill={color} stroke={color} />
  </svg>
);

export default CustomRadioButtonIcon;
