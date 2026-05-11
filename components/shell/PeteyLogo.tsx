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
 * Two logo variants render side-by-side inside .pd-logo:
 *   1. .logo-default — the Petey speech-bubble glyph (currentColor + dots).
 *   2. .logo-price   — the $PRICE wordmark (red rounded-rect, yellow
 *                      "PRICE" letters). Gated by notifs.priceLogo.
 *
 * Sim mirrors this with inline display style swapping (sim 4410 +
 * togglePriceLogo at 9579–9600). We use the same display gating so
 * .logo-price's CSS transition (globals.css :200) runs on toggle.
 *
 * The sentiment widget sits inside the logo wrap (sibling of the
 * logo and bubble) per the sim's structure. It's gated by
 * body.sentiment-on — empty/invisible by default in step 2.
 */

import { useEffect, useState } from 'react';
import { usePdNotifs } from '@/lib/state/PdNotifsContext';
import {
    getSentimentState,
    subscribeSentiment,
    type SentimentState,
} from '@/lib/engines/sentimentEngine';

export function PeteyLogo() {
    const [rotated, setRotated] = useState(false);
    const { notifs } = usePdNotifs();

    const showPrice = notifs.priceLogo;
    const showSentiment = notifs.sentimentOn;

    /* Mirror the sentimentEngine state into local component state so
       React re-renders on every cycle (sim 12253-12259 renderSentimentIcon
       directly mutates DOM; React mirrors via useState).

       Subscription is gated on showSentiment — when off, no subscriber
       exists and the engine auto-stops. When on, subscribe immediately
       and prime local state with the engine's current value so the
       widget reflects the latest tick on remount. */
    const [sentiment, setSentiment] = useState<SentimentState>(() =>
        getSentimentState()
    );
    useEffect(() => {
        if (!showSentiment) return;
        setSentiment(getSentimentState());
        const unsubscribe = subscribeSentiment(() => {
            setSentiment(getSentimentState());
        });
        return unsubscribe;
    }, [showSentiment]);

    /* Dispatch a CustomEvent every time `rotated` flips so FaviconEngine
       can mirror the easter-egg rotation (sim 5530–5533: classList.toggle
       'rotated' → updateFavicon with isRotated). The initial mount also
       dispatches once with rotated=false, which is a no-op for the
       engine's default state.

       A DOM event keeps this state local to PeteyLogo (same as sim's
       module-level `currentFaviconRotated`) without lifting it into a
       global context that would persist across reloads. */
    useEffect(() => {
        document.dispatchEvent(
            new CustomEvent('pd:petey-rotated', { detail: { rotated } })
        );
    }, [rotated]);

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
                    style={showPrice ? { display: 'none' } : undefined}
                >
                    <path d={PETEY_BUBBLE_PATH} fill="currentColor" />
                    <path d={PETEY_GLYPH_PATH} fill="var(--bg-color)" stroke="var(--bg-color)" strokeWidth="1.5" />
                    <path d={PETEY_DOT_RIGHT_PATH} fill="currentColor" />
                    <path d={PETEY_DOT_LEFT_PATH} fill="currentColor" />
                    <path d={PETEY_DOT_TOP_PATH} fill="currentColor" />
                </svg>
                <span
                    className="logo-price"
                    style={{
                        display: showPrice ? 'flex' : 'none',
                        height: '28px',
                        width: 'auto',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    aria-label="$PRICE Token Logo"
                    role="img"
                >
                    <svg
                        height="100%"
                        width="auto"
                        viewBox="0 0 517 403"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d={PRICE_LOGO_BG_PATH} fill="#FF0055" />
                        <path d={PRICE_LOGO_P_PATH} fill="#FFE600" />
                        <path d={PRICE_LOGO_R_PATH} fill="#FFE600" />
                        <path d={PRICE_LOGO_I_PATH} fill="#FFE600" />
                        <path d={PRICE_LOGO_C_PATH} fill="#FFE600" />
                        <path d={PRICE_LOGO_E_PATH} fill="#FFE600" />
                    </svg>
                </span>
            </div>
            <div className="petey-bubble" id="peteyBubble">
                <a href="/" className="pb-home" title="Home">HOME</a>
                <a href="/$price" className="pb-price" title="$PRICE Token">$PRICE</a>
            </div>
            <div
                className="sentiment-widget"
                id="sentimentWidget"
                title={showSentiment ? sentiment.tip : undefined}
                aria-hidden={!showSentiment}
                style={{ display: showSentiment ? 'flex' : 'none' }}
            >
                {/* Sentiment Weather glyph — driven by sentimentEngine.
                    7-state cycle (Strong Bull → Capitulation), ~3-6s
                    cadence with 75% per-tick swap probability. Pauses
                    on document.hidden. */}
                <span
                    id="sentimentIcon"
                    aria-hidden="true"
                    data-sentiment={sentiment.label}
                >
                    {sentiment.icon}
                </span>
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


/* ───────────────────────────────────────────────────────────
   $PRICE wordmark logo (red rounded-rect bg, yellow letters)
   Mirrors sim.html:4410–4419 verbatim.
   ─────────────────────────────────────────────────────────── */

const PRICE_LOGO_BG_PATH =
    'M402.943 0.000288893C418.273 -0.0331421 432.917 2.83163 446.334 10.3132C472.888 25.1195 488.658 47.629 491.091 78.0617C492.535 96.1232 491.818 114.368 491.849 132.53C491.919 173.809 491.92 215.089 491.796 256.368C491.757 269.206 490.014 281.78 484.442 293.596C471.668 320.684 450.615 337.102 421.204 342.574C415.688 343.601 409.974 343.912 404.348 343.938C374.268 344.079 344.186 344.055 314.106 343.986C311.36 343.979 309.44 344.713 307.581 346.829C292.735 363.721 277.735 380.478 262.853 397.339C256.532 404.499 248.016 405.046 241.563 397.954C229.099 384.256 216.927 370.293 204.642 356.432C201.691 353.103 198.952 349.558 195.757 346.486C194.391 345.174 192.108 344.142 190.236 344.132C164.126 343.993 138.015 343.94 111.906 344.117C99.6913 344.2 88.0179 341.884 76.3977 337.512C50.3642 326.084 33.6398 306.866 26.5824 279.616C24.9144 273.175 24.169 266.321 24.1501 259.654C23.9855 201.407 23.9145 143.157 24.1573 84.9102C24.3362 42.0049 56.5072 6.10359 99.0847 0.754953C102.768 0.29223 106.533 0.377761 110.26 0.371612C132.147 0.335549 154.033 0.368124 175.92 0.340368C251.594 0.244364 327.269 0.165467 402.943 0.000288893Z';

const PRICE_LOGO_P_PATH =
    'M56.14 138.002C64.9133 138.002 72.5667 139.495 79.1 142.482C85.6333 145.468 90.6267 149.528 94.08 154.662C97.5333 159.795 99.26 165.535 99.26 171.882C99.26 182.335 95.9933 190.548 89.46 196.522C82.9267 202.402 71.82 205.342 56.14 205.342H37.66V232.222C37.66 233.248 37.2867 234.135 36.54 234.882C35.7933 235.628 34.9067 236.002 33.88 236.002H3.78C2.75333 236.002 1.86666 235.628 1.12 234.882C0.373328 234.135 0 233.248 0 232.222V141.782C0 140.755 0.373328 139.868 1.12 139.122C1.86666 138.375 2.75333 138.002 3.78 138.002H56.14ZM55.58 179.442C57.82 179.442 59.5933 178.788 60.9 177.482C62.2067 176.082 62.86 174.262 62.86 172.022C62.86 169.688 62.2067 167.775 60.9 166.282C59.5933 164.788 57.82 164.042 55.58 164.042H37.8V179.442H55.58Z';

const PRICE_LOGO_R_PATH =
    'M203.785 231.662C203.972 232.035 204.065 232.455 204.065 232.922C204.065 233.762 203.739 234.508 203.085 235.162C202.525 235.722 201.825 236.002 200.985 236.002H169.205C167.899 236.002 166.685 235.675 165.565 235.022C164.539 234.368 163.792 233.528 163.325 232.502L151.005 204.782H139.245V232.222C139.245 233.248 138.872 234.135 138.125 234.882C137.379 235.628 136.492 236.002 135.465 236.002H105.225C104.199 236.002 103.312 235.628 102.565 234.882C101.819 234.135 101.445 233.248 101.445 232.222V141.782C101.445 140.755 101.819 139.868 102.565 139.122C103.312 138.375 104.199 138.002 105.225 138.002H159.685C168.085 138.002 175.412 139.355 181.665 142.062C188.012 144.768 192.865 148.688 196.225 153.822C199.585 158.955 201.265 164.975 201.265 171.882C201.265 184.575 196.365 193.768 186.565 199.462L203.785 231.662ZM156.745 178.882C158.799 178.882 160.385 178.228 161.505 176.922C162.625 175.522 163.185 173.795 163.185 171.742C163.185 169.688 162.625 167.915 161.505 166.422C160.479 164.835 158.892 164.042 156.745 164.042H139.245V178.882H156.745Z';

const PRICE_LOGO_I_PATH =
    'M273.591 207.302H298.931C299.957 207.302 300.844 207.675 301.591 208.422C302.337 209.168 302.711 210.055 302.711 211.082V232.222C302.711 233.248 302.337 234.135 301.591 234.882C300.844 235.628 299.957 236.002 298.931 236.002H210.171C209.144 236.002 208.257 235.628 207.511 234.882C206.764 234.135 206.391 233.248 206.391 232.222V211.082C206.391 210.055 206.764 209.168 207.511 208.422C208.257 207.675 209.144 207.302 210.171 207.302H235.791V166.702H210.171C209.144 166.702 208.257 166.328 207.511 165.582C206.764 164.835 206.391 163.948 206.391 162.922V141.782C206.391 140.755 206.764 139.868 207.511 139.122C208.257 138.375 209.144 138.002 210.171 138.002H298.931C299.957 138.002 300.844 138.375 301.591 139.122C302.337 139.868 302.711 140.755 302.711 141.782V162.922C302.711 163.948 302.337 164.835 301.591 165.582C300.844 166.328 299.957 166.702 298.931 166.702H273.591V207.302Z';

const PRICE_LOGO_C_PATH =
    'M348.016 198.202C348.016 202.028 349.276 204.968 351.796 207.022C354.409 209.075 357.909 210.102 362.296 210.102C366.216 210.102 369.109 209.448 370.976 208.142C372.843 206.835 374.429 204.875 375.736 202.262C376.949 199.835 378.583 198.622 380.636 198.622H410.876C411.716 198.622 412.416 198.948 412.976 199.602C413.629 200.162 413.956 200.862 413.956 201.702C413.956 207.395 412.043 212.995 408.216 218.502C404.389 223.915 398.556 228.442 390.716 232.082C382.969 235.628 373.496 237.402 362.296 237.402C352.309 237.402 343.396 235.908 335.556 232.922C327.809 229.842 321.649 225.175 317.076 218.922C312.503 212.575 310.216 204.688 310.216 195.262V178.742C310.216 169.315 312.503 161.475 317.076 155.222C321.649 148.875 327.809 144.208 335.556 141.222C343.396 138.142 352.309 136.602 362.296 136.602C373.496 136.602 382.969 138.422 390.716 142.062C398.556 145.608 404.389 150.135 408.216 155.642C412.043 161.055 413.956 166.608 413.956 172.302C413.956 173.142 413.629 173.888 412.976 174.542C412.416 175.102 411.716 175.382 410.876 175.382H380.636C378.583 175.382 376.949 174.168 375.736 171.742C374.429 169.128 372.843 167.168 370.976 165.862C369.109 164.555 366.216 163.902 362.296 163.902C357.909 163.902 354.409 164.928 351.796 166.982C349.276 169.035 348.016 171.975 348.016 175.802V198.202Z';

const PRICE_LOGO_E_PATH =
    'M512.601 208.702C513.628 208.702 514.515 209.075 515.261 209.822C516.008 210.568 516.381 211.455 516.381 212.482V232.222C516.381 233.248 516.008 234.135 515.261 234.882C514.515 235.628 513.628 236.002 512.601 236.002H424.121C423.095 236.002 422.208 235.628 421.461 234.882C420.715 234.135 420.341 233.248 420.341 232.222V141.782C420.341 140.755 420.715 139.868 421.461 139.122C422.208 138.375 423.095 138.002 424.121 138.002H511.201C512.228 138.002 513.115 138.375 513.861 139.122C514.608 139.868 514.981 140.755 514.981 141.782V161.522C514.981 162.548 514.608 163.435 513.861 164.182C513.115 164.928 512.228 165.302 511.201 165.302H456.741V174.122H503.501C504.528 174.122 505.415 174.495 506.161 175.242C506.908 175.988 507.281 176.875 507.281 177.902V196.102C507.281 197.128 506.908 198.015 506.161 198.762C505.415 199.508 504.528 199.882 503.501 199.882H456.741V208.702H512.601Z';
