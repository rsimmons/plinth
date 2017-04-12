# Plinth

### [Check out the demo](https://rsimmons.github.io/plinth/rack.html)

**Plinth** combines the ideas of [modular synthesis](https://en.wikipedia.org/wiki/Modular_synthesizer) (ala [Eurorack](https://en.wikipedia.org/wiki/Doepfer_A-100)) and audio plugin standards (VST, AU, etc.) and puts it in your web browser.

This repository contains:
- A demo/proof-of-concept [modular patching environment](https://rsimmons.github.io/plinth/rack.html)
- *(coming soon)* A draft API spec for authoring and hosting components (aka blocks)

The Web Audio API has brought powerful audio processing capabilities to the web, but there isn’t yet a popular format for authoring **reusable audio components**. My hope is that Plinth will help spur work towards defining a such community standard (as VST/AU/etc and Eurorack have in the software and hardware worlds, respectively).

# Development

## Install and Build

To build the Plinth demo from source, first install dependencies. Several blocks are bundled in this same repository, and some of them have their own dependencies, so run:

```
$ src/blocks/install-all.sh
$ npm install
```

or for those fashionable folk:

```
$ src/blocks/install-all-yarn.sh
$ yarn
```

Then build with `npm run build`, run a local server with `npm run start`, and open http://localhost:5000/rack.html.

To automatically rebuild when you make changes to the source, run `npm run watch` in another session. Note that the files in `public/` are not automatically copied `build/` when running `watch` so if you edit any of those you'll need to run `npm run build` again. 

# Plinth Block API *(work in progress)*

## Background

The Web Audio API provides the means to do sophisticated audio processing in the browser with fairly high performance and low latency. And with the upcoming addition of [AudioWorklets](https://webaudio.github.io/web-audio-api/#AudioWorklet) it will soon be possible to define arbitrary signal processing functions in Javascript while still enjoying the performance benefits the API provides.

Web Audio provides the low-level mechanisms for processing audio in the browser, but there is not yet a widely adopted format for defining *composable audio components*. Standardized interfaces for audio components in desktop software (e.g. [VST](https://en.wikipedia.org/wiki/Virtual_Studio_Technology), etc) and hardware (e.g. [Eurorack](https://en.wikipedia.org/wiki/Doepfer_A-100)) have lead to flourishing ecosystems of component creators and consumers, and it seems natural to try to emulate these successes within the web browser platform. Furthermore, the browser platform offers unique opportunities for fluent and unobstructed sharing of components thanks to its widespread adoption and ability to safely execute untrusted 3rd party code.

## Overview

A Plinth component (aka *block*) is implemented as a Javascript "class", i.e. constructor function to be used with the new operator to create a block instance. We'll informally refer to both block classes and block instances as just "blocks" when it's clear which one we're talking about. We'll use the term *host* to refer to any code that instantiates and connects together blocks. We'll refer to a set of connected blocks as a *graph* or *patch*.

Blocks expose input and output *ports*, each of which accepts or emits a certain signal *type* (the most important type being **audio**). Hosts can enumerate the names and types of a block's ports.

Blocks typically render a user interface via HTML-based *views*. A block can present two different types of views: a *panel view* and a *window view*. A panel view is meant to be similar to a modular synthesizer panel, having a standardized height and fixed width. A window view can have arbitrary dimensions. Window views are meant to be used as "expanded" interfaces for more sophisticated blocks that require them, typically presented at a much larger size than panel views. A block can present either panel or window view, or both, or neither. Hosts can manage hiding and revealing blocks views to end users.

Block views typically display controls that affect how a block generates or processes sound. In the spirit of modular synthesizers, blocks can also accept audio-rate "control" input signals. For example, an oscillator block might have a panel knob to set its fundamental frequency, and also a control signal input port that influences that same frequency. Note that for the sake of simplicity this spec *does not* define any special relationship between view controls and input ports. This means that view controls are not always "automatable", and control inputs may not have associated view controls.

Blocks can support saving and loading their settings, so that hosts can save and load patches.

## Design Considerations

In order to achieve the widest possible adoption, the spec aims to balance power and flexibility against complexity and ease of implementation. To those ends, the following design guidelines have been adopted:

[TODO: define some terminology]
* Target non-programmer musicians as end users of blocks.
* Prioritize ease of block authoring over ease of host authoring.
* Prioritize hosting blocks in dynamic patching interfaces, but also make it reasonably easy to instantiate and use them programmatically with Javascript (example [here](https://rsimmons.github.io/plinth/programmatic.html)).
* Support complex signal graphs as typically found in [modular synthesizers](https://en.wikipedia.org/wiki/Modular_synthesizer) rather than biasing towards linear signal processing chains as in common in most [DAWs](https://en.wikipedia.org/wiki/Digital_audio_workstation).
* Allow for hierarchical "nesting" scenarios where blocks can act as hosts to other blocks.
