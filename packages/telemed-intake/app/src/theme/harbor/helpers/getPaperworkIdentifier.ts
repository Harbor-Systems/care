export default (params: any): string | undefined => {
  return Object.hasOwn(params, 'locationID') ? (params['locationID'] as string | undefined) : undefined;
};
