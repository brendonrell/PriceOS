'use client';

/*
 * PeteyLogo
 *
 * The rotating PD logo on the left side of the navbar. Click rotates
 * the logo -90° and reveals a dotted-border speech bubble with HOME
 * and $PRICE links. Clicking again unrotates.
 *
 * The rotation state is local to this component — no global state
 * needed. The CSS rules for the speech bubble appearance use the
 * adjacent-sibling selector (.pd-logo.rotated + .petey-bubble) so
 * the bubble fades in/out automatically based on the .rotated class.
 *
 * SVG path data lives in the constants block at the bottom of the
 * file rather than its own module. The geometry is specific to this
 * one component and never used elsewhere; keeping it inline makes
 * the component self-contained at the cost of a longer file.
 *
 * The sentiment widget sits inside the logo wrap (sibling of the
 * logo and bubble) per the sim's structure. It's gated by
 * body.sentiment-on — empty/invisible by default in step 2.
 */

import { useState } from 'react';

export function PeteyLogo() {
    const [rotated, setRotated] = useState(false);

    return (
        <div className="pd-logo-wrap">
            <div
                className={`pd-logo${rotated ? ' rotated' : ''}`}
                onClick={() => setRotated((r) => !r)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setRotated((r) => !r);
                    }
                }}
                aria-label="Price Discussion — toggle home menu"
                title="Price Discussion — Click to Rotate"
            >
                <svg
                    className="logo-default"
                    viewBox="0 0 761 655"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    role="img"
                    aria-label="Price Discussion Logo"
                >
                    <path d={PETEY_BUBBLE_PATH} fill="currentColor" />
                    <path d={PETEY_GLYPH_PATH} fill="var(--bg-color)" stroke="var(--bg-color)" strokeWidth="1.5" />
                    <path d={PETEY_DOT_RIGHT_PATH} fill="currentColor" />
                    <path d={PETEY_DOT_LEFT_PATH} fill="currentColor" />
                    <path d={PETEY_DOT_TOP_PATH} fill="currentColor" />
                </svg>
            </div>
            <div className="petey-bubble" id="peteyBubble">
                <a href="/" className="pb-home" title="Home">HOME</a>
                <a href="/$price" className="pb-price" title="$PRICE Token">$PRICE</a>
            </div>
            <div className="sentiment-widget" id="sentimentWidget" aria-hidden="true">
                {/* Sentiment Weather glyph — populated when body.sentiment-on is set.
                    Step 2 ships an empty placeholder; the 7-state weather logic
                    lands when Sentiment Weather is wired. */}
                <span aria-hidden="true">{'\u2601\uFE0E'}</span>
            </div>
        </div>
    );
}


/* ───────────────────────────────────────────────────────────
   SVG path data (Petey speech-bubble logo with per-mille dots)
   ─────────────────────────────────────────────────────────── */

const PETEY_BUBBLE_PATH =
    'M85.2021 548.561C42.8699 529.988 15.6745 498.753 4.19883 454.463C1.48652 443.995 0.274671 432.855 0.244021 422.019C-0.0236921 327.349 -0.138982 232.675 0.255934 138.005C0.54681 68.2708 52.8591 9.92044 122.093 1.22737C128.083 0.475297 134.204 0.613785 140.264 0.603791C175.854 0.545177 211.443 0.598222 247.032 0.55311C370.084 0.397073 493.136 0.268937 616.187 0.000470443C641.114 -0.0539179 664.926 4.60223 686.744 16.7622C729.923 40.8271 755.566 77.412 759.522 126.875C761.87 156.23 760.704 185.883 760.754 215.403C760.868 282.494 760.87 349.586 760.668 416.677C760.605 437.544 757.771 457.979 748.71 477.184C727.938 521.211 693.705 547.895 645.88 556.789C636.911 558.457 627.619 558.964 618.471 559.006C569.559 559.235 520.645 559.196 471.731 559.083C467.266 559.073 464.145 560.266 461.121 563.704C436.981 591.159 412.59 618.395 388.391 645.798C378.113 657.437 364.265 658.326 353.773 646.799C333.506 624.535 313.712 601.841 293.735 579.312C288.937 573.901 284.484 568.14 279.288 563.147C277.067 561.014 273.355 559.337 270.31 559.321C227.855 559.096 185.396 559.009 142.941 559.297C123.079 559.432 104.097 555.667 85.2021 548.561Z';

const PETEY_GLYPH_PATH =
    'M564.413 318.773C555.823 317.223 547.291 315.061 538.632 314.244C517.392 312.239 498.825 318.448 484.023 334.217C481.368 337.046 479.939 336.415 477.387 334.249C472.203 329.851 467.097 325.037 461.162 321.904C440.592 311.044 418.923 311.324 397.503 318.615C376.076 325.909 360.791 340.458 354.626 362.568C349.523 380.87 349.701 399.887 353.682 418.343C359.769 446.564 381.205 464.964 410.61 469.341C436.248 473.158 459.824 470.164 478.296 449.641C481.259 446.349 483.009 448.684 484.929 450.646C491.699 457.565 499.109 463.403 508.531 466.482C522.601 471.081 536.778 471.095 551.349 469.393C577.445 466.344 601.157 447.291 606.842 421.584C609.543 409.373 609.216 396.409 609.52 383.768C610.225 354.439 593.273 329.264 564.413 318.773ZM293.97 270.436C304.87 263.703 313.412 254.807 319.121 243.255C330.605 220.02 328.412 195.353 326.627 170.769C326.335 166.735 325.16 162.689 323.888 158.815C315.53 133.362 298.551 116.884 272.121 111.537C253.092 107.687 233.884 107.554 216.063 116.838C194.33 128.16 180.8 146.181 178.048 170.566C176.374 185.406 176.917 200.617 177.739 215.591C178.943 237.537 188.442 255.882 207.135 267.713C234.885 285.275 263.982 284.555 293.97 270.436ZM348.806 312.356C391.815 248.872 435.897 186.106 477.553 120.908C465.934 119.774 454.846 120.106 443.791 119.639C438.018 119.394 434.67 121.278 431.414 126.12C396.717 177.729 361.947 229.292 326.806 280.599C285.48 340.934 243.763 401.002 202.245 461.206C201.337 462.524 200.775 464.08 199.579 466.468C214.173 466.468 227.617 466.599 241.052 466.298C242.692 466.261 244.713 464.196 245.83 462.571C280.051 412.77 314.181 362.906 348.806 312.356Z';

const PETEY_DOT_RIGHT_PATH =
    'M507.266 410.237C506.947 398.666 505.667 387.443 506.861 376.489C508.487 361.575 520.49 353.604 537.53 354.185C550.555 354.63 561.421 364.77 562.428 378.491C563.126 388.011 563.056 397.654 562.449 407.186C561.691 419.107 553.013 427.626 540.709 429.728C523.198 432.721 513.649 427.265 507.266 410.237Z';

const PETEY_DOT_LEFT_PATH =
    'M444.737 425.35C434.349 431.954 423.524 432.537 413.125 427.669C402.753 422.813 398.864 413.051 398.51 402.069C398.259 394.282 398.135 386.396 399.052 378.685C400.753 364.387 411.955 354.729 425.125 354.126C443.139 353.301 452.558 363.567 454.084 378.15C455.187 388.693 454.813 399.608 453.342 410.111C452.604 415.382 447.949 420.103 444.737 425.35Z';

const PETEY_DOT_TOP_PATH =
    'M278.519 194.495C277.378 204.322 277.17 213.805 274.859 222.745C272.113 233.368 264.783 237.631 253.212 237.735C240.318 237.852 233.177 233.613 229.29 223.142C224.817 211.096 225.515 198.537 226.23 186.048C226.518 181.002 227.018 175.882 228.217 170.99C231.199 158.815 238.713 153.213 251.95 152.618C264.255 152.064 271.812 156.478 275.274 168.588C277.587 176.677 277.522 185.446 278.519 194.495Z';
