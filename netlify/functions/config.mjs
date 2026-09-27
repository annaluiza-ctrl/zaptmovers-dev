/*
  Zapt Movers — public runtime config.

  The Google Maps browser key has to reach the browser, but it must not sit in
  the repository: Netlify's secrets scanning fails the build when it finds a Google API key
  in a committed file, and committing credentials is a bad habit
  even when the credential is meant to be public.

  So the key lives in an environment variable and this endpoint hands it over.

  Environment variable (Netlify > Site configuration > Environment variables):
    GOOGLE_MAPS_KEY

  This is not a secret-keeping mechanism. Anyone can read the key from the
  page, exactly as before. What actually protects it is the HTTP referrer
  restriction on the key in Google Cloud Console. Set that up.
*/

export default async () => {
  return new Response(JSON.stringify({
    googleMapsKey: process.env.GOOGLE_MAPS_KEY || ''
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300'
    }
  });
};

export const config = { path: '/api/config' };
