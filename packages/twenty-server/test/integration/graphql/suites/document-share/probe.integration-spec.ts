import request from 'supertest';

describe('probe guest document share endpoint', () => {
  it('prints the raw response', async () => {
    const response = await request(`http://localhost:${APP_PORT}`)
      .post('/graphql')
      .send({
        query: `query GetGuestDocumentShare($shareToken: String!) {
          getGuestDocumentShare(shareToken: $shareToken) {
            documentRecordId
            titleSnapshot
            bodySnapshot
            isPassphraseProtected
          }
        }`,
        variables: { shareToken: 'unknown-token-probe' },
      });

    console.log('STATUS', response.status);
    console.log('BODY', JSON.stringify(response.body, null, 2));
    console.log('TEXT', response.text?.slice(0, 2000));
  });
});
