// External dependencies
const github = require('@actions/github');
const core = require('@actions/core');
const { Octokit } = require("@octokit/rest");
const sgMail = require('@sendgrid/mail'),
  showdown = require('showdown'),
  fs = require('fs'),
  request = require("request")

// E-mail string templates
const SUBJECT_TEMPLATE = "New $REPO$ release: $NAME$ ($VERSION$)",
  FOOTER_TEMPLATE = "\n\n## Where to find the release?\n\n[Visit the release page]($RELEASEURL$)\n\n## Found a bug?\n\n [Open a new issue in our repo]($NEWISSUEURL$)"


let setCredentials = function () {
  sgMail.setApiKey(process.env.SENDGRID_API_TOKEN)
}

const fetchRelease = async () => {
  const context = github.context;
  const { data: releases } = await octokit.repos.listReleases({
    ...context.repo,
  });

  const latestRelease = releases[0];
  core.setOutput('release', latestRelease);

  return latestRelease;
}

let prepareMessage = async (recipients, release) => {
  const context = github.context;
  const converter = new showdown.Converter(),
    repoName = context.repo.repo,
    releaseVersion = release.tag_name,
    releaseName = release.name,
    releaseURL = release.html_url,
    newIssueURL = repository.html_url + "/issues/new";

  // This is not efficient but I find it quite readable
  const emailSubject = SUBJECT_TEMPLATE
    .replace("$REPO$", repoName)
    .replace("$VERSION$", releaseVersion)
    .replace("$NAME$", releaseName),

  const footer = FOOTER_TEMPLATE
    .replace("$RELEASEURL$", releaseURL)
    .replace("$NEWISSUEURL$", newIssueURL),

  const releaseBody = converter.makeHtml(release.body + footer)

  let msg = {
    to: ['subscribers@no-reply.com'],
    from: {
      name: 'GitHub Releases',
      email: 'no-reply@no-reply.com'
    },
    bcc: recipients,
    subject: emailSubject,
    html: releaseBody
  };

  return msg
}

sendEmails = async (msg) => {
  try {
    await sgMail.send(msg);

    console.log("Mail sent!");
  } catch (error) {

    //Log friendly error
    console.error(error.toString())

    //Extract error msg
    const { message, code, response } = error

    //Extract response msg
    const { headers, body } = response
  }

}



let getRecipients = async (recipients_url, callback) => {
  const body = await request.get(recipients_url);

  return body.split(/\r\n|\n|\r/);
}

setCredentials()
const recipients = await getRecipients(process.env.RECIPIENTS);
const release = await fetchRelease();
const message = await prepareMessage(recipients, release);
await sendEmails(message);
