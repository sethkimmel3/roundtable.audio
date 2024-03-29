# roundtable.audio
[roundtable.audio](https://roundtable.audio) (formerly discourse.fm) is a web app for hosting live, moderator-decentralized audio chat rooms (or "roundtables"). These can be public or private to join or listen to, and host up to 100 participants.

## Sources
While it's possible to start ad-hoc roundtables about anything, part of what differentiates roundtable.audio is integrating external sources to populate discussion topics. Currently, the only sources are:

* Twitter: you can start a roundtable by tweeting at the roundtable Twitter bot from any tweet thread and including the words "start a roundtable." Give it a try and see what happens! 
* [Y Combinator's Hacker News](https://news.ycombinator.com/): For the Hacker News integration, you can visit [hackernews.roundtable.audio](https://hackernews.roundtable.audio) to see a page which intends to emulate the Hacker News homepage, but rather than having a comment section for each story, you can pop into a roundtable.
I'd like to eventually have sources for subreddits, popular news sites, other web-based communities, and more. Wherever people are synchronously talking via text on the web, it can probably benefit from the addition of roundtables/live audio.

## Contributing
This codebase is far from a polished product, and it would be great to have others get involved - especially on the addition of more sources and the cultivation of their adoption. If you'd like to help/hack on any aspects of this project, send an email to [info@roundtable.audio](mailto:info@roundtable.audio) or open issues/pull requests in this repo. It would be greatly appreciated!

## Code Overview
This repo is organized into a number of microservices running on Docker. For ease of understanding, it's simplest to just explain what the notable ones do.

### webserver
Handles the serving of client code from an nginx proxied server. All of the frontend code can be found in the client-code directory. Take a look at some of the neat visualization modules in found in the js subdirectory!

### nodejs
Controls the core management of roundtables, including authenticating user credentials (for private roundtables), passing of WebRTC credentials, chat control, and more. Essentially, it's the backend that controls everything <em>except</em> for the relaying of audio data.

### kraken_listen_only
This is the core audio relaying service, which is an untracked clone of a feature I built on top of the [Kraken SFU](https://github.com/MixinNetwork/kraken). The feature branch can be found [here](https://github.com/sethkimmel3/kraken/tree/adding-listen-only). This SFU uses a Golang implementation of WebRTC built by the [Pion](https://github.com/pion) community. Many thanks to these open-source projects for the extraordinary work they've done in enabling new possibilities with WebRTC.

### coturn
This is a simple implementation of the open-source [coturn server](https://github.com/coturn/coturn). A TURN server is required for WebRTC signaling. While it's not strictly necessary to self-host one, it's probably the best and most reliable way to go.

### songbird
Controls the Twitter bot which continuously listens for tweets sent to it containing the right keywords, creates new roundtables, and returns the links to the user.
