# Sonibloc

**Sonibloc** is a specification for browser-based audio processing components based on the [Web Audio API](https://webaudio.github.io/web-audio-api/). It draws inspiration mainly from [modular synthesizers](https://en.wikipedia.org/wiki/Modular_synthesizer), popular desktop audio plugin standards (VST, AU, etc.), and [Native Instruments Reaktor Blocks](https://www.native-instruments.com/en/products/komplete/synths/reaktor-6/blocks/).

This repository contains a draft spec (see below) and a proof of concept implementation, both of which are currently works in progress.

Some crude demos:
* [Composing blocs dynamically](https://rsimmons.github.io/sonibloc-prototype2/rack.html) inside a "rack" bloc
* [Composing blocs programmatically](https://rsimmons.github.io/sonibloc-prototype2/programmatic.html) in Javascript

# Draft Spec

## Background

The Web Audio API provides the means to do sophisticated audio processing in the browser with fairly high performance and low latency. And with the upcoming addition of [AudioWorklets](https://webaudio.github.io/web-audio-api/#AudioWorklet) it will soon be possible to define arbitrary signal processing functions in Javascript while still enjoying the performance benefits the API provides.

Web Audio provides the low-level mechanisms for processing audio in the browser, but there is not yet a widely adopted standard for defining *composable audio components*. Standardized interfaces for audio components in desktop software (e.g. [VST](https://en.wikipedia.org/wiki/Virtual_Studio_Technology)) and hardware (e.g. [Eurorack](https://en.wikipedia.org/wiki/Doepfer_A-100)) have lead to flourishing ecosystems of component creators and consumers, and it seems natural to try to emulate these successes within the web browser platform. Furthermore, the browser platform offers unique opportunities for fluent and unobstructed sharing of components thanks to its widespread adoption and ability to safely execute untrusted 3rd party code.

## Overview

A Sonibloc component (aka *bloc*) is implement as a Javascript "class", i.e. constructor function to be used with the new operator to create a bloc instance. We'll informally refer to both bloc classes and bloc instances as just "blocs" when it's clear which one we're talking about. We'll use the term *host* to refer to any code that instantiates and connects together blocs. We'll refer to a set of connected blocs as a *graph* or *patch*.

Blocs expose input and output *ports*, each of which accepts or emits a certain signal *type* (the most important type being **audio**). Hosts can enumerate the names and types of a bloc's ports.

Blocs typically render a user interface via HTML-based *views*. A bloc can present two different types of views: a *panel view* and a *window view*. A panel view is meant to be similar to a modular synthesizer panel, having a standardized height and fixed width. A window view can have arbitrary dimensions. Window views are meant to be used as "expanded" interfaces for more sophisticated blocs that require them, typically presented at a much larger size than panel views. A bloc can present either panel or window view, or both, or neither. Hosts can manage hiding and revealing blocs views to end users.

Bloc views typically display controls that affect how a bloc generates or processes sound. In the spirit of modular synthesizers, blocs can also accept audio-rate "control" input signals. For example, an oscillator bloc might have a panel knob to set its fundamental frequency, and also a control signal input port that influences that same frequency. Note that for the sake of simplicity this spec *does not* define any special relationship between view controls and input ports. This means that view controls are not always "automatable", and control inputs may not have associated view controls.

Blocs can support saving and loading their settings (via opaque strings), so that hosts can save and load patches.

## Design Considerations

In order to achieve the widest possible adoption, the spec aims to balance power and flexibility against complexity and ease of implementation. To those ends, the following design guidelines have been adopted:

[TODO: define some terminology]
* Target non-programmer musicians as end users of blocs.
* Prioritize ease of bloc authoring over ease of host authoring.
* Prioritize hosting blocs in dynamic patching interfaces, but also make it reasonably easy to instantiate and use them programmatically with Javascript.
* Support complex signal graphs as typically found in [modular synthesizers](https://en.wikipedia.org/wiki/Modular_synthesizer) rather than biasing towards linear signal processing chains as in common in most [DAWs](https://en.wikipedia.org/wiki/Digital_audio_workstation).
* Allow for hierarchical "nesting" scenarios where blocs can act as hosts to other blocs.
* Don't specify any special relationship between bloc ports and controls in bloc views.
