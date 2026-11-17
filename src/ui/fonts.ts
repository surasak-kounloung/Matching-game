import gothamMediumUrl from '../../fonts/gotham/Gotham-Medium.woff2?url';

export async function loadFonts(): Promise<void> {
  const face = new FontFace('Gotham', `url(${gothamMediumUrl})`, { weight: '500', display: 'block' });
  document.fonts.add(face);
  await face.load();
}
