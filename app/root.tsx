import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  json,
  useLoaderData,
} from "@remix-run/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { request } from "@octokit/request";

import stylesheet from "~/tailwind.css?url";

const FRAMEWORKS = [
  { owner: "vercel", repo: "next.js" },
  { owner: "remix-run", repo: "remix" },
  { owner: "withastro", repo: "astro" },
  { owner: "sveltejs", repo: "kit" },
  { owner: "angular", repo: "angular" },
  { owner: "nuxt", repo: "framework" },
  { owner: "gatsbyjs", repo: "gatsby" },
  { owner: "solidjs", repo: "solid-start" },
  { owner: "redwoodjs", repo: "redwood" },
  { owner: "facebook", repo: "react" },
  { owner: "preactjs", repo: "preact" },
  { owner: "sveltejs", repo: "svelte" },
  { owner: "solidjs", repo: "solid" },
  { owner: "QwikDev", repo: "qwik" },
];
const MIN_CONTRIBUTIONS = 50;
const MAX_CONTRIBUTORS = 10;
const MIN_CONTRIBUTOR_SCORE = 0.05;

const isBotLogin = (login: string): boolean => {
  return (
    login.includes("[bot]") || login.includes("-bot") || login.includes("bot-")
  );
};

const getContributorsForRepo = async ({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}) => {
  const { data } = await request("GET /repos/{owner}/{repo}/contributors", {
    owner,
    repo,
    per_page: 30,
    headers: {
      authorization: `token ${process.env.GITHUB_API_TOKEN}`,
    },
  });
  const totalContributionsInBatch = data.reduce(
    (acc, { contributions }) => acc + contributions,
    0
  );
  return data
    .map(({ login, contributions }) => ({
      login: login!, // can only be nil if we pass `anon=1`
      contributions,
      contributorScore: contributions / totalContributionsInBatch,
    }))
    .filter(({ login }) => !isBotLogin(login))
    .filter(
      ({ contributions, contributorScore }) =>
        contributions > MIN_CONTRIBUTIONS &&
        contributorScore > MIN_CONTRIBUTOR_SCORE
    )
    .slice(0, MAX_CONTRIBUTORS);
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export const loader = async () => {
  const contributorsByRepo = await Promise.all(
    FRAMEWORKS.map(async ({ owner, repo }) => {
      const contributors = await getContributorsForRepo({ owner, repo });
      return { owner, repo, contributors };
    })
  );
  return json({ contributorsByRepo });
};

export default function App() {
  const { contributorsByRepo } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <h1 className="text-4xl font-bold">Framework Top Contributors</h1>
        {contributorsByRepo.length > 0 ? (
          <div className="items-start justify-center gap-6 rounded-lg p-8 md:grid lg:grid-cols-2 xl:grid-cols-3">
            {contributorsByRepo.map(({ owner, repo, contributors }) => (
              <Card key={`${owner}/${repo}`}>
                <CardHeader>
                  <CardTitle>
                    {owner}/{repo}
                  </CardTitle>
                  <CardDescription>Card Description?</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol>
                    {contributors.map((contributor) => (
                      <li key={contributor.login}>
                        <a href={`https://github.com/${contributor.login}`}>
                          {contributor.login}
                        </a>{" "}
                        {": "}
                        <span>{contributor.contributions} contributions</span>
                        <span>{` (${Math.round(
                          contributor.contributorScore * 100
                        )}%)`}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
                <CardFooter>
                  <p>Card Footer?</p>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <p>
            <i>No data found... Whoops!</i>
          </p>
        )}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
