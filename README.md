# Plinth

### [Check out the demo](https://rsimmons.github.io/plinth/rack.html)

# Contents

- [Introduction](#introduction)
- [Development](#development)
- [Block API](#block-api) *(in progress)*

# Introduction

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

# Block API

*(Note: This is a very incomplete work in progress)*

## Background

The Web Audio API provides the means to do sophisticated audio processing in the browser with fairly high performance and low latency. And with the upcoming addition of [AudioWorklets](https://webaudio.github.io/web-audio-api/#AudioWorklet) it will soon be possible to define arbitrary signal processing functions in Javascript while still enjoying the performance benefits the API provides.

Web Audio provides the low-level mechanisms for processing audio in the browser, but there is not yet a widely adopted format for defining *composable audio components*. Standardized interfaces for audio components in desktop software (e.g. [VST](https://en.wikipedia.org/wiki/Virtual_Studio_Technology), etc) and hardware (e.g. [Eurorack](https://en.wikipedia.org/wiki/Doepfer_A-100)) have lead to flourishing ecosystems of component creators and consumers, and it seems natural to try to emulate these successes within the web browser platform. Furthermore, the browser platform offers unique opportunities for fluent and unobstructed sharing of components thanks to its widespread adoption and ability to safely execute untrusted 3rd party code.

## Overview

A Plinth component (aka *block*) is implemented as a Javascript "class", i.e. constructor function to be used with the new operator to create a block instance. We'll informally refer to both block classes and block instances as just "blocks" when it's clear which one we're talking about. We'll use the term *host* to refer to any code that instantiates and connects together blocks. We'll refer to a set of connected blocks as a *graph* or *patch*.

Blocks expose input and output *ports*, each of which accepts or emits a certain signal *type* (the most important type being **audio**). Hosts can enumerate the names and types of a block's ports.

Blocks typically render an HTML-based user interface, which we call a *view*. Most blocks will render a view that is similar to a modular synthesizer panel, having a standardized height and fixed width. A block can, however, render a view that has arbitrary dimensions. This is meant to be used by sophisticated blocks that require a "full window" view, such as blocks that present an internal patching interface. Hosts can manage hiding and revealing blocks views to end users.

Block views typically display controls that affect how a block generates or processes sound. In the spirit of modular synthesizers, blocks can also accept audio-rate "control" input signals. For example, an oscillator block might have a panel knob to set its fundamental frequency, and also a control signal input port that influences that same frequency. Note that for the sake of simplicity this spec *does not yet* define any relationship between view controls and input ports. This means that view controls are not always "automatable", and control inputs may not have associated view controls.

Blocks can support saving and loading their settings, so that hosts can save and load patches.

## API Details

Blocks present the following API to hosts.

#### `new MyBlockClass(audioContext, viewContainer, settings)`

Create a new instance of the block.

- `audioContext`: Web Audio `AudioContext` object
- `viewContainer`: DOM node for block to insert its UI into
- `settings`: (optional) Settings saved from a previous block instance

#### `.inputs`, `.outputs`

Input and output port definitions.

The `.inputs` and `.outputs` properties are each an object with one property for each input or output port, respectively. The property name is the port name, and the property value is a port object. A port object always has a `type` property, which currently may be either `'audio'` or `'gateEvent'`. Depending on the port type, the port object has further properties:

- `audio` ports also have a `node` property, which references a Web Audio `AudioNode` instance. For inputs, `node` may alternatively refer to an `AudioParam`, since those may be connected to the same was as `AudioNode`s.
- `gateEvent` ports have, for inputs a `notify` property, and for outputs a `subscribe` property.
  - `notify` must be a function with arguments `(time, value)`, where `time` is the time of the gate change (in Web Audio coordinates) and `value` is a boolean (`true` for high, `false` for low).
  - `subscribe` must be a function that takes a single callback-function argument. That callback is called with the `(time, value)` arguments described above. `subscribe` returns a "disconnect" function, that when called will unsubscribe the given callack from further notifications.
 
So for example, to connect two `audio`-type ports of block instances `a` and `b`:

```js
a.outputs['dry'].node.connect(b.inputs['channel1'].node);
```

and to connect two `gateEvent`-type ports:

```js
var disconnect = a.outputs['gate4'].subscribe(b.inputs['clock'].notify);
```

The `.inputs` and `.outputs` properties should not be `undefined`, but may be empty objects.

#### `.save()`

Save the block instance's current settings and return them as a value.

To support serializaion, it's required that the returned value be generally JSONable (typically, an object). In addition to JSONable values, settings may also include ArrayBuffer and AudioBuffer objects (which means that hosts must be able to extract these if they want to serialize the settings).

NOTE: The `.save` property may be undefined for blocks that do not support saving their settings or have no settings to be saved, so hosts should check if the method is defined before calling.

#### `.deactivate()`

Do any necessary cleanup before the host removes the block.

To cleanly remove a block from a running graph, a host needs to disconnect any input/output ports, and then remove the block's UI (contents of the `viewContainer` passed into the constructor) from the DOM. Because the block may need to do cleanup (e.g. to cancel calls to `setInterval` or global event handlers), a host must call the `.deactivate()` method when removing a block, before removing the block's UI from the DOM.

NOTE: The `.deactivate` property may be undefined for blocks that have nothing to deinitialize, so hosts should check if the method is defined before calling.

## API Example

The block API is mainly intended to be consumed by "host" applications that allow dynamic loading and connecting of blocks. But to illustrate the basics of its usage, here is a simple example of constructing and connecting up a few blocks programmatically: [the code](https://github.com/rsimmons/plinth/blob/master/src/programmatic.js) and [the result](https://rsimmons.github.io/plinth/programmatic.html).

## Design Considerations

In order to achieve the widest possible adoption, the spec aims to balance power and flexibility against complexity and ease of implementation. To those ends, the following design guidelines have been adopted:

[TODO: define some terminology]
* Target non-programmer musicians as end users of blocks.
* Prioritize ease of block authoring over ease of host authoring.
* Prioritize hosting blocks in dynamic patching interfaces, but also make it reasonably easy to instantiate and use them programmatically with Javascript (example [here](https://rsimmons.github.io/plinth/programmatic.html)).
* Support complex signal graphs as typically found in [modular synthesizers](https://en.wikipedia.org/wiki/Modular_synthesizer) rather than biasing towards linear signal processing chains as in common in most [DAWs](https://en.wikipedia.org/wiki/Digital_audio_workstation).
* Allow for hierarchical "nesting" scenarios where blocks can act as hosts to other blocks.
