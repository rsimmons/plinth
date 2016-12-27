# Sonibloc

**Sonibloc** is a specification for browser-based audio processing components based on the [Web Audio API](https://webaudio.github.io/web-audio-api/). It draws inspiration mainly from [modular synthesizers](https://en.wikipedia.org/wiki/Modular_synthesizer), popular desktop audio plugin standards (VST, AU, etc.), and [Native Instruments Reaktor Blocks](https://www.native-instruments.com/en/products/komplete/synths/reaktor-6/blocks/).

This repository contains a draft spec (see below) and a proof of concept implementation, both of which are currently works in progress.

[TODO: link to demo]

# Draft Spec

## Background

The Web Audio API provides the means to do sophisticated audio processing in the browser with fairly high performance and low latency. And with the upcoming addition of [AudioWorklets](https://webaudio.github.io/web-audio-api/#AudioWorklet) it will soon be possible to define arbitrary signal processing functions in Javascript while still enjoying the performance benefits the API provides.

Web Audio provides the low-level mechanisms for processing audio in the browser, but there is not yet a widely adopted standard for defining *composable audio components*. Standardized interfaces for audio components in desktop software (e.g. [VST](https://en.wikipedia.org/wiki/Virtual_Studio_Technology)) and hardware (e.g. [Eurorack](https://en.wikipedia.org/wiki/Doepfer_A-100)) have lead to flourishing ecosystems of component creators and consumers, and it seems natural to try to emulate these successes within the web browser platform. Furthermore, the browser platform offers unique opportunities for fluent and unobstructed sharing of components thanks to its widespread adoption and ability to safely execute untrusted 3rd party code.

## Design Considerations

In order to achieve the widest possible adoption, the specification aims to balance power and flexibility against complexity and ease of implementation. To those ends, the following design guidelines have been adopted:

[TODO: define some terminology]
* Target non-programmer musicians as end users of blocs.
* Prioritize ease of bloc authoring over ease of host authoring.
* Support complex signal graphs as typically found in [modular synthesizers](https://en.wikipedia.org/wiki/Modular_synthesizer) rather than biasing towards linear signal processing chains as in common in most [DAWs](https://en.wikipedia.org/wiki/Digital_audio_workstation).
* Allow for hierarchical "nesting" scenarios where blocs can act as hosts to other blocs.
