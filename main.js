// External dependencies
const github = require('@actions/github');
const core = require('@actions/core');
const { Octokit } = require("@octokit/rest");
const sgMail = require('@sendgrid/mail');
const showdown = require('showdown');
const axios = require("axios");
const octokit = new Octokit();

// E-mail string templates
const SUBJECT_TEMPLATE = "New $REPO$ release: $NAME$ ($VERSION$)";
const FOOTER_TEMPLATE = "\n\n## Where to find the release?\n\n[Visit the release page]($RELEASEURL$)\n\n## Found a bug?\n\n [Open a new issue in our repo]($NEWISSUEURL$)";


const setCredentials = () => sgMail.setApiKey(process.env.SENDGRID_API_TOKEN);

const fetchRelease = async () => {
  const context = github.context;
  const { data: releases } = await octokit.repos.listReleases({
    ...context.repo
  });

  core.debug('Retrieved releases:');
  core.debug(releases);

  const latestRelease = releases[0];
  core.setOutput('release', latestRelease);

  return latestRelease;
}

const prepareMessage = async (recipients, release) => {
  const context = github.context;
  const converter = new showdown.Converter();
  const repoName = context.repo.repo;
  const releaseVersion = release.tag_name;
  const releaseName = release.name;
  const releaseURL = release.html_url;
  const newIssueURL = repository.html_url + "/issues/new";

  // This is not efficient but I find it quite readable
  let emailSubject = SUBJECT_TEMPLATE
    .replace("$REPO$", repoName)
    .replace("$VERSION$", releaseVersion)
    .replace("$NAME$", releaseName);

  let footer = FOOTER_TEMPLATE
    .replace("$RELEASEURL$", releaseURL)
    .replace("$NEWISSUEURL$", newIssueURL);

  const releaseBody = converter.makeHtml(release.body + footer);

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

  return msg;
}

const sendEmails = async (msg) => {
  try {
    await sgMail.send(msg);
  } catch (error) {
    //Log friendly error
    console.error(error.toString());
  }
}

const getRecipients = async (recipients_url) => {
  const { data } = await axios.get(recipients_url);
  return data.split(/\r\n|\n|\r/);
}

async function run() {
  try {
    setCredentials()
    const recipients = await getRecipients(process.env.RECIPIENTS);
    const release = await fetchRelease();
    core.debug('Found release:');
    core.debug(release);
    const message = await prepareMessage(recipients, release);
    await sendEmails(message);
    console.log("Mail sent!");
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run();