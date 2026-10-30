/* The blur placeholder of a picture: a ~400-byte webp inlined as the CSS background so the frame is painted before the file
   arrives. Only a webp data URL is accepted; anything else gives no background. (No dependency: the client player imports it.) */
export const BLUR = /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/;
export const blurUrl = (blur: string): string | undefined =>
  BLUR.test(blur) ? `url("${encodeURI(blur)}")` : undefined;
