# Roundtable.audio
[roundtable.audio](roundtable.audio) (formerly discourse.fm) is a web app for live, moderator-decentralized audio chat rooms (or "roundtables"). These can be public or private to join or listen to, and host up to 100 participants.

## Sources
While it's possible to start ad-hoc roundtables about anything, part of what differentiates roundtable.audio is integrating external sources to populate discussion topics. Currently, the only sources are:
<ul>
<li> Twitter: you can start a roundtable by tweeting at the roundtable Twitter bot and including the words "start a roundtable." Give it a try and see what happens! </li>
<li> [Y Combinator's Hacker News](https://news.ycombinator.com/): For the Hacker News integration, you can visit [hackernews.roundtable.audio](hackernews.roundtable.audio) to see a page which intends to emulate the Hacker News homepage, but rather than having a comment section for each story, you can pop into a roundtable.
</li>
</ul>
I'd like to eventually have sources for subreddits, popular news sites, other web-based communities, and more. Wherever people are synchronously talking via text on the web, I believe can benefit from the addition of roundtables/live audio.

## Contributing
Originally, the code for this project was closed, but I decided to open-source it seeing as how many people were interested in this space and the community nature of it in general. The codebase is very far from a polished product, and it would be great to have others get involved - especially the addition of more sources and the cultivation of their adoption. If you'd like to hack with me on this, feel free to email me at [info@roundtable.audio](mailto:info@roundtable.audio), or open issues/pull requests.

## Code Overview
This repo is organized with a microservices architecture running on Docker. For ease of understanding, I'll just explain the notable microservices.

### webserver
Handles the serving of client code from an nginx proxied server. All of the frontend code can be found in the client-code directory. Take a look at some of the neat visualization modules in found in the js subdirectory!

### nodejs
Controls the core management of roundtables, including authenticating user credentials (for private roundtables), passing of WebRTC credentials, chat control, and more. Essentially, it's the backend that controls everything <em>except</em> for the relaying of audio data.

### kraken_listen_only
This is the core audio relaying service, which is an untracked clone of a feature I built on top of the [Kraken SFU](https://github.com/MixinNetwork/kraken). The feature branch can be found [here](https://github.com/sethkimmel3/kraken/tree/adding-listen-only). This SFU uses a Golang implementation of WebRTC built by the [Pion](https://github.com/pion) community. Many thanks to these open-source projects for the extraordinary work they've done in enabling new possibilities with WebRTC.

### coturn
This is an implementation of the open-source [coturn project](https://github.com/coturn/coturn). A TURN server is required for WebRTC signaling.

### songbird
Controls the Twitter bot which continuously listens for tweets, creates new ones, and returns the links to the user.
