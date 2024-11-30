import Cookies from 'js-cookie';

export const setTokenCookies = (accessToken: string, refreshToken: string) => {
  Cookies.set('access_token', accessToken);
  Cookies.set('refresh_token', refreshToken);
};

export const removeTokenCookies = () => {
  Cookies.remove('access_token');
  Cookies.remove('refresh_token');
};