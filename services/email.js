const mailjetLib = require("node-mailjet");
const mailjet = mailjetLib.apiConnect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE
);

async function sendMail(subject, htmlText, recipient) {
  const request = mailjet.post("send").request({
    FromEmail: process.env.MJ_API_EMAIL,
    FromName: process.env.MJ_API_EMAIL_NAME,
    Subject: subject,
    "Html-part": htmlText,
    Recipients: [{ Email: recipient }],
  });
  await request
    .then((result) => {
      console.log(result.body);
    })
    .catch((err) => {
      console.log(err.statusCode);
    });
}

module.exports = sendMail;
