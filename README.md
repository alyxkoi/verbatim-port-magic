# Alyxlab

I am attaching a complete, finished, single file website: alyxlab-site-v1.html. It is not a draft, a mockup, or a reference for inspiration. It is the final product and it already works exactly as intended.

Your job is to port this into my React project without changing how it looks or behaves in any way. This is a mechanical translation task, not a design or engineering task. Every value in this file was arrived at through many rounds of testing. Values that look arbitrary are deliberate. Assume anything you are tempted to "clean up," round off, or modernize is load bearing.

What to create

src/styles/alyxlab.css — the entire contents of the <style> block, copied verbatim, byte for byte. Import it in main.tsx.

src/pages/Index.tsx — the entire <body> markup as one single component. Do not split it into separate section components.

Put all of the JavaScript in one useEffect with an empty dependency array in that same component, and return a cleanup function that removes every listener and disconnects every observer.

Keep the Google Fonts <link> tags for Geist and Geist Mono in index.html.

Keep the hidden <svg> defs block containing the gradients. Several sections reference those gradient IDs and will render wrong without it.

The only changes you are allowed to make

These are syntax conversions, nothing more:

class becomes className

Inline style="..." strings become objects

Hyphenated SVG attributes become camelCase: stroke-width to strokeWidth, stroke-linecap to strokeLinecap, stop-color to stopColor, clip-path to clipPath

onsubmit="return false" becomes onSubmit={(e) => e.preventDefault()}

Self closing tags get closed properly

document.getElementById calls can stay as they are, or become refs. Either is fine as long as the behavior is identical.

Absolutely do not do any of the following

Do not convert any CSS to Tailwind. Not one class. The stylesheet stays as raw CSS.

Do not use Framer Motion, Motion, GSAP, ScrollTrigger, react-spring, AOS, or any animation or scroll library. This page's scroll behavior is deliberately step based, driven by native CSS scroll snap and raw scroll position math. Motion's useScroll and useTransform are distance scrubbed, which is the exact behavior this design rejects. Introducing any of these breaks it.

Do not change any numeric value. Not a duration, delay, easing curve, viewport unit, threshold, opacity, blur radius, or z-index.

Do not add shadcn/ui components anywhere.

Do not "improve" accessibility by changing structure or adding ARIA that is not already present.

Do not reorganize, rename, or reformat the CSS.

Do not add SSR, lazy loading, or code splitting.

Do not touch any copy, pricing number, or piece of text.

Values that must survive exactly

If any of these differ from the original file after your port, the port has failed:

Problem section, two beat sequence

.runway height: 55vh desktop, 50vh at max-width 700px

.pstep.a at top:100svh, .pstep.b at top:calc(100svh + 25vh)

.pstep must keep scroll-snap-align:start and scroll-snap-stop:always

html must keep scroll-snap-type:y proximity

Phase trigger lock+innerHeight*.10, release lock+innerHeight*.05

The absTop() function must walk offsetTop through offsetParent. Do not replace it with getBoundingClientRect, which reports the wrong position for sticky elements.

Phone theater

--seg:82vh desktop, 66vh mobile

--tail:45vh desktop, 34vh mobile

STEPS = 6

The six .snap markers at .4167, 1.25, 2.0833, 2.9167, 3.75, 4.5833 multiples of --seg

dist() must keep subtracting tailPx(). Removing it breaks all six beat positions at once.

Curtain transitions

Every rounded section keeps its negative margin-top. Those overlaps are what make the rounded corners reveal the section behind instead of showing black. .lite is -6vh, .track and .work and .says and .close are -9vh or -8vh as written.

.close keeps transform:translateY(9vh) and its .lit class rise

Everything else

.atoms must stay position:sticky; top:0 inside .darkzone. The runway div after it is what gives sticky its travel. Do not delete it as empty markup.

The prefers-reduced-motion block at the end of the stylesheet stays exactly as written.

After you finish

Tell me which files you created and confirm you did not convert any CSS to Tailwind and did not install any animation library.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://verbatim-port-magic.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2dacd6ff-2e46-4ae0-95ff-29dec1a8b494).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
