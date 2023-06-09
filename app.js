import dotenv from "dotenv";
import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import fs from "fs";
import http from "http";

dotenv.config();

const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;

const privateKey = fs.readFileSync(privateKeyPath, "utf8");

const app = new App({
    appId: appId,
    privateKey: privateKey,
    webhooks: {
        secret: webhookSecret,
    },
});

async function handlePushEvent({ octokit, payload }) {
    try {
        const { after, before, commits } = payload; // Destructure the necessary properties from the payload object
        console.log("After:", after);
        console.log("Before:", before);

        
        for (const commit of commits) {
            const commitSHA = commit.id; // Access the SHA of each commit
            console.log("Commit SHA:", commitSHA);

            // Make additional requests or process the commit as needed
            const commitDetails = await octokit.request(
                "GET /repos/{owner}/{repo}/commits/{ref}",
                {
                    owner: payload.repository.owner.login,
                    repo: payload.repository.name,
                    ref: commitSHA,
                    headers: {
                        "x-github-api-version": "2022-11-28",
                        Accept: "application/vnd.github+json",
                    },
                }
            );

            // Process the commit details
            const commitMessage = commitDetails.data.commit.message;
            const committer = commitDetails.data.commit.committer;
            console.log("Committer:", committer);
            console.log("Commit message:", commitMessage);
            console.log("Commit details:", commitDetails);
        }
    } catch (error) {
        // Error handling
        if (error.response && error.response.status) {
            console.error(
                `Error! Status: ${error.response.status}. Message: ${error.response.data.message}`
            );
        } else {
            console.error("An error occurred:", error);
        }
    }
}


app.webhooks.on("push", handlePushEvent);
// app.webhooks.on("pull_request.opened", handlePullRequestOpened);

app.webhooks.onError((error) => {
    if (error.name === "AggregateError") {
        console.error(`Error processing request: ${error.event}`);
    } else {
        console.error(error);
    }
});

const port = process.env.PORT || 3000;
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const path = "/api/webhook";

const middleware = createNodeMiddleware(app.webhooks, { path });

http.createServer(middleware).listen(process.env.port, () => {
    console.log(`Server is listening for events at: ${localWebhookUrl}`);
    console.log("Press Ctrl + C to quit.");
});
