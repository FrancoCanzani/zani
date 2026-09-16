import { useEffect, useId, useRef, type CSSProperties } from "react";

type GradientStop = { key: string; offset: number; opacity: number };
type GradientSegment = { key: string; pathData: string };
type GradientLayer = {
  id: string;
  name: string;
  ordinal: string;
  color: string;
  blur: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  style: { durationMs: number; revealDistance: number };
  envelope: GradientStop[];
  segments: GradientSegment[];
};

export type SombraGradientProps = {
  className?: string;
  style?: CSSProperties;
};

type AnimationFrameApi = {
  request: (callback: FrameRequestCallback) => number | null;
  cancel: (handle: number) => void;
};

function getAnimationFrameApi(): AnimationFrameApi | null {
  if (typeof window === "undefined") return null;
  const request = window.requestAnimationFrame;
  const cancel = window.cancelAnimationFrame;
  if (typeof request !== "function" || typeof cancel !== "function") return null;
  return {
    request: (callback) => {
      try {
        return request.call(window, callback);
      } catch {
        return null;
      }
    },
    cancel: (handle) => {
      try {
        cancel.call(window, handle);
      } catch {
        // Motion cleanup must never prevent the component from unmounting.
      }
    },
  };
}

function getReducedMotionQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)");
  } catch {
    return null;
  }
}

function subscribeToReducedMotion(
  query: MediaQueryList,
  listener: () => void,
): (() => void) | null {
  if (
    typeof query.addEventListener === "function" &&
    typeof query.removeEventListener === "function"
  ) {
    try {
      query.addEventListener("change", listener);
      return () => {
        try {
          query.removeEventListener("change", listener);
        } catch {
          // Legacy and partial implementations may reject cleanup calls.
        }
      };
    } catch {
      return null;
    }
  }
  if (typeof query.addListener === "function" && typeof query.removeListener === "function") {
    try {
      query.addListener(listener);
      return () => {
        try {
          query.removeListener(listener);
        } catch {
          // Legacy and partial implementations may reject cleanup calls.
        }
      };
    } catch {
      return null;
    }
  }
  return null;
}

const LAYERS: GradientLayer[] = [
  {
    "id": "dia-7",
    "name": "Layer 08",
    "ordinal": "08",
    "color": "#ffc0fd",
    "blur": 15,
    "bounds": {
      "minX": 0,
      "minY": 11.980000000000018,
      "maxX": 1303.4811111111112,
      "maxY": 659
    },
    "style": {
      "durationMs": 1100,
      "revealDistance": 0.65
    },
    "envelope": [
      {
        "key": "lower-bound",
        "offset": 0,
        "opacity": 0
      },
      {
        "key": "from-dia-6-sample-0",
        "offset": 80.29,
        "opacity": 0
      },
      {
        "key": "from-dia-6-sample-1",
        "offset": 80.30924804687501,
        "opacity": 0.49975574010747437
      },
      {
        "key": "from-dia-6-sample-2",
        "offset": 80.32849609375,
        "opacity": 0.4995112414467253
      },
      {
        "key": "from-dia-6-sample-4",
        "offset": 80.3669921875,
        "opacity": 0.49902152641878667
      },
      {
        "key": "from-dia-6-sample-8",
        "offset": 80.443984375,
        "opacity": 0.4980392156862745
      },
      {
        "key": "from-dia-6-sample-16",
        "offset": 80.59796875,
        "opacity": 0.49606299212598426
      },
      {
        "key": "from-dia-6-sample-32",
        "offset": 80.90593750000001,
        "opacity": 0.49206349206349204
      },
      {
        "key": "from-dia-6-sample-64",
        "offset": 81.52187500000001,
        "opacity": 0.4838709677419355
      },
      {
        "key": "from-dia-6-sample-128",
        "offset": 82.75375000000001,
        "opacity": 0.4666666666666667
      },
      {
        "key": "from-dia-6-sample-192",
        "offset": 83.985625,
        "opacity": 0.4482758620689655
      },
      {
        "key": "from-dia-6-sample-256",
        "offset": 85.2175,
        "opacity": 0.42857142857142855
      },
      {
        "key": "from-dia-6-sample-320",
        "offset": 86.449375,
        "opacity": 0.4074074074074074
      },
      {
        "key": "from-dia-6-sample-384",
        "offset": 87.68125,
        "opacity": 0.38461538461538464
      },
      {
        "key": "from-dia-6-sample-448",
        "offset": 88.91312500000001,
        "opacity": 0.36
      },
      {
        "key": "from-dia-6-sample-512",
        "offset": 90.14500000000001,
        "opacity": 0.3333333333333333
      },
      {
        "key": "from-dia-6-sample-576",
        "offset": 91.376875,
        "opacity": 0.30434782608695654
      },
      {
        "key": "from-dia-6-sample-640",
        "offset": 92.60875,
        "opacity": 0.2727272727272727
      },
      {
        "key": "from-dia-6-sample-704",
        "offset": 93.840625,
        "opacity": 0.23809523809523808
      },
      {
        "key": "from-dia-6-sample-768",
        "offset": 95.0725,
        "opacity": 0.2
      },
      {
        "key": "from-dia-6-sample-800",
        "offset": 95.6884375,
        "opacity": 0.1794871794871795
      },
      {
        "key": "from-dia-6-sample-832",
        "offset": 96.304375,
        "opacity": 0.15789473684210525
      },
      {
        "key": "from-dia-6-sample-864",
        "offset": 96.9203125,
        "opacity": 0.13513513513513514
      },
      {
        "key": "from-dia-6-sample-896",
        "offset": 97.53625,
        "opacity": 0.1111111111111111
      },
      {
        "key": "from-dia-6-sample-928",
        "offset": 98.1521875,
        "opacity": 0.08571428571428572
      },
      {
        "key": "from-dia-6-sample-960",
        "offset": 98.768125,
        "opacity": 0.058823529411764705
      },
      {
        "key": "from-dia-6-sample-992",
        "offset": 99.3840625,
        "opacity": 0.030303030303030304
      },
      {
        "key": "from-dia-6-sample-1024",
        "offset": 100,
        "opacity": 0
      }
    ],
    "segments": [
      {
        "key": "segment-0",
        "pathData": "M 0 240.2434011543014 L 141.22222222222223 240.2434011543014 L 141.22222222222223 659 L 0 659 Z"
      },
      {
        "key": "segment-1",
        "pathData": "M 141.22222222222223 171.7562598291944 L 282.44444444444446 171.7562598291944 L 282.44444444444446 659 L 141.22222222222223 659 Z"
      },
      {
        "key": "segment-2",
        "pathData": "M 282.44444444444446 108.62048245566587 L 423.6666666666667 108.62048245566587 L 423.6666666666667 659 L 282.44444444444446 659 Z"
      },
      {
        "key": "segment-3",
        "pathData": "M 423.6666666666667 52.894937751894076 L 564.8888888888889 52.894937751894076 L 564.8888888888889 659 L 423.6666666666667 659 Z"
      },
      {
        "key": "segment-4",
        "pathData": "M 564.8888888888889 11.980000000000018 L 738.5922222222223 11.980000000000018 L 738.5922222222223 659 L 564.8888888888889 659 Z"
      },
      {
        "key": "segment-5",
        "pathData": "M 738.5922222222223 52.894937751894076 L 879.8144444444445 52.894937751894076 L 879.8144444444445 659 L 738.5922222222223 659 Z"
      },
      {
        "key": "segment-6",
        "pathData": "M 879.8144444444445 108.62048245566587 L 1021.0366666666667 108.62048245566587 L 1021.0366666666667 659 L 879.8144444444445 659 Z"
      },
      {
        "key": "segment-7",
        "pathData": "M 1021.0366666666667 171.75625982919445 L 1162.258888888889 171.75625982919445 L 1162.258888888889 659 L 1021.0366666666667 659 Z"
      },
      {
        "key": "segment-8",
        "pathData": "M 1162.258888888889 240.2434011543014 L 1303.4811111111112 240.2434011543014 L 1303.4811111111112 659 L 1162.258888888889 659 Z"
      }
    ]
  },
  {
    "id": "dia-6",
    "name": "Layer 07",
    "ordinal": "07",
    "color": "#fd02f5",
    "blur": 15,
    "bounds": {
      "minX": 0,
      "minY": 11.980000000000018,
      "maxX": 1303.4811111111112,
      "maxY": 659
    },
    "style": {
      "durationMs": 1100,
      "revealDistance": 0.65
    },
    "envelope": [
      {
        "key": "lower-bound",
        "offset": 0,
        "opacity": 0
      },
      {
        "key": "from-dia-5-support",
        "offset": 68.27,
        "opacity": 0
      },
      {
        "key": "from-dia-5-sample-0",
        "offset": 68.271,
        "opacity": 1
      },
      {
        "key": "from-dia-5-sample-1024",
        "offset": 80.29,
        "opacity": 1
      },
      {
        "key": "to-dia-7-sample-32",
        "offset": 80.90593750000001,
        "opacity": 0.9384765625
      },
      {
        "key": "to-dia-7-sample-64",
        "offset": 81.52187500000001,
        "opacity": 0.87890625
      },
      {
        "key": "to-dia-7-sample-96",
        "offset": 82.13781250000001,
        "opacity": 0.8212890625
      },
      {
        "key": "to-dia-7-sample-128",
        "offset": 82.75375000000001,
        "opacity": 0.765625
      },
      {
        "key": "to-dia-7-sample-160",
        "offset": 83.36968750000001,
        "opacity": 0.7119140625
      },
      {
        "key": "to-dia-7-sample-192",
        "offset": 83.985625,
        "opacity": 0.66015625
      },
      {
        "key": "to-dia-7-sample-224",
        "offset": 84.6015625,
        "opacity": 0.6103515625
      },
      {
        "key": "to-dia-7-sample-256",
        "offset": 85.2175,
        "opacity": 0.5625
      },
      {
        "key": "to-dia-7-sample-288",
        "offset": 85.8334375,
        "opacity": 0.5166015625
      },
      {
        "key": "to-dia-7-sample-320",
        "offset": 86.449375,
        "opacity": 0.47265625
      },
      {
        "key": "to-dia-7-sample-352",
        "offset": 87.0653125,
        "opacity": 0.4306640625
      },
      {
        "key": "to-dia-7-sample-384",
        "offset": 87.68125,
        "opacity": 0.390625
      },
      {
        "key": "to-dia-7-sample-416",
        "offset": 88.2971875,
        "opacity": 0.3525390625
      },
      {
        "key": "to-dia-7-sample-448",
        "offset": 88.91312500000001,
        "opacity": 0.31640625
      },
      {
        "key": "to-dia-7-sample-480",
        "offset": 89.52906250000001,
        "opacity": 0.2822265625
      },
      {
        "key": "to-dia-7-sample-512",
        "offset": 90.14500000000001,
        "opacity": 0.25
      },
      {
        "key": "to-dia-7-sample-544",
        "offset": 90.7609375,
        "opacity": 0.2197265625
      },
      {
        "key": "to-dia-7-sample-576",
        "offset": 91.376875,
        "opacity": 0.19140625
      },
      {
        "key": "to-dia-7-sample-608",
        "offset": 91.9928125,
        "opacity": 0.1650390625
      },
      {
        "key": "to-dia-7-sample-640",
        "offset": 92.60875,
        "opacity": 0.140625
      },
      {
        "key": "to-dia-7-sample-672",
        "offset": 93.2246875,
        "opacity": 0.1181640625
      },
      {
        "key": "to-dia-7-sample-704",
        "offset": 93.840625,
        "opacity": 0.09765625
      },
      {
        "key": "to-dia-7-sample-736",
        "offset": 94.4565625,
        "opacity": 0.0791015625
      },
      {
        "key": "to-dia-7-sample-768",
        "offset": 95.0725,
        "opacity": 0.0625
      },
      {
        "key": "to-dia-7-sample-800",
        "offset": 95.6884375,
        "opacity": 0.0478515625
      },
      {
        "key": "to-dia-7-sample-832",
        "offset": 96.304375,
        "opacity": 0.03515625
      },
      {
        "key": "to-dia-7-sample-864",
        "offset": 96.9203125,
        "opacity": 0.0244140625
      },
      {
        "key": "to-dia-7-sample-896",
        "offset": 97.53625,
        "opacity": 0.015625
      },
      {
        "key": "to-dia-7-sample-928",
        "offset": 98.1521875,
        "opacity": 0.0087890625
      },
      {
        "key": "to-dia-7-sample-960",
        "offset": 98.768125,
        "opacity": 0.00390625
      },
      {
        "key": "to-dia-7-sample-992",
        "offset": 99.3840625,
        "opacity": 0.0009765625
      },
      {
        "key": "to-dia-7-sample-1024",
        "offset": 100,
        "opacity": 0
      }
    ],
    "segments": [
      {
        "key": "segment-0",
        "pathData": "M 0 240.2434011543014 L 141.22222222222223 240.2434011543014 L 141.22222222222223 659 L 0 659 Z"
      },
      {
        "key": "segment-1",
        "pathData": "M 141.22222222222223 171.7562598291944 L 282.44444444444446 171.7562598291944 L 282.44444444444446 659 L 141.22222222222223 659 Z"
      },
      {
        "key": "segment-2",
        "pathData": "M 282.44444444444446 108.62048245566587 L 423.6666666666667 108.62048245566587 L 423.6666666666667 659 L 282.44444444444446 659 Z"
      },
      {
        "key": "segment-3",
        "pathData": "M 423.6666666666667 52.894937751894076 L 564.8888888888889 52.894937751894076 L 564.8888888888889 659 L 423.6666666666667 659 Z"
      },
      {
        "key": "segment-4",
        "pathData": "M 564.8888888888889 11.980000000000018 L 738.5922222222223 11.980000000000018 L 738.5922222222223 659 L 564.8888888888889 659 Z"
      },
      {
        "key": "segment-5",
        "pathData": "M 738.5922222222223 52.894937751894076 L 879.8144444444445 52.894937751894076 L 879.8144444444445 659 L 738.5922222222223 659 Z"
      },
      {
        "key": "segment-6",
        "pathData": "M 879.8144444444445 108.62048245566587 L 1021.0366666666667 108.62048245566587 L 1021.0366666666667 659 L 879.8144444444445 659 Z"
      },
      {
        "key": "segment-7",
        "pathData": "M 1021.0366666666667 171.75625982919445 L 1162.258888888889 171.75625982919445 L 1162.258888888889 659 L 1021.0366666666667 659 Z"
      },
      {
        "key": "segment-8",
        "pathData": "M 1162.258888888889 240.2434011543014 L 1303.4811111111112 240.2434011543014 L 1303.4811111111112 659 L 1162.258888888889 659 Z"
      }
    ]
  },
  {
    "id": "dia-5",
    "name": "Layer 06",
    "ordinal": "06",
    "color": "#fa3d1d",
    "blur": 15,
    "bounds": {
      "minX": 0,
      "minY": 11.980000000000018,
      "maxX": 1303.4811111111112,
      "maxY": 659
    },
    "style": {
      "durationMs": 1100,
      "revealDistance": 0.65
    },
    "envelope": [
      {
        "key": "lower-bound",
        "offset": 0,
        "opacity": 0
      },
      {
        "key": "from-dia-4-support",
        "offset": 58.66,
        "opacity": 0
      },
      {
        "key": "from-dia-4-sample-0",
        "offset": 58.660999999999994,
        "opacity": 1
      },
      {
        "key": "from-dia-4-sample-1024",
        "offset": 68.27,
        "opacity": 1
      },
      {
        "key": "to-dia-6-sample-1024",
        "offset": 80.29,
        "opacity": 0
      },
      {
        "key": "upper-bound",
        "offset": 100,
        "opacity": 0
      }
    ],
    "segments": [
      {
        "key": "segment-0",
        "pathData": "M 0 240.2434011543014 L 141.22222222222223 240.2434011543014 L 141.22222222222223 659 L 0 659 Z"
      },
      {
        "key": "segment-1",
        "pathData": "M 141.22222222222223 171.7562598291944 L 282.44444444444446 171.7562598291944 L 282.44444444444446 659 L 141.22222222222223 659 Z"
      },
      {
        "key": "segment-2",
        "pathData": "M 282.44444444444446 108.62048245566587 L 423.6666666666667 108.62048245566587 L 423.6666666666667 659 L 282.44444444444446 659 Z"
      },
      {
        "key": "segment-3",
        "pathData": "M 423.6666666666667 52.894937751894076 L 564.8888888888889 52.894937751894076 L 564.8888888888889 659 L 423.6666666666667 659 Z"
      },
      {
        "key": "segment-4",
        "pathData": "M 564.8888888888889 11.980000000000018 L 738.5922222222223 11.980000000000018 L 738.5922222222223 659 L 564.8888888888889 659 Z"
      },
      {
        "key": "segment-5",
        "pathData": "M 738.5922222222223 52.894937751894076 L 879.8144444444445 52.894937751894076 L 879.8144444444445 659 L 738.5922222222223 659 Z"
      },
      {
        "key": "segment-6",
        "pathData": "M 879.8144444444445 108.62048245566587 L 1021.0366666666667 108.62048245566587 L 1021.0366666666667 659 L 879.8144444444445 659 Z"
      },
      {
        "key": "segment-7",
        "pathData": "M 1021.0366666666667 171.75625982919445 L 1162.258888888889 171.75625982919445 L 1162.258888888889 659 L 1021.0366666666667 659 Z"
      },
      {
        "key": "segment-8",
        "pathData": "M 1162.258888888889 240.2434011543014 L 1303.4811111111112 240.2434011543014 L 1303.4811111111112 659 L 1162.258888888889 659 Z"
      }
    ]
  },
  {
    "id": "dia-4",
    "name": "Layer 05",
    "ordinal": "05",
    "color": "#ffd400",
    "blur": 15,
    "bounds": {
      "minX": 0,
      "minY": 11.980000000000018,
      "maxX": 1303.4811111111112,
      "maxY": 659
    },
    "style": {
      "durationMs": 1100,
      "revealDistance": 0.65
    },
    "envelope": [
      {
        "key": "lower-bound",
        "offset": 0,
        "opacity": 0
      },
      {
        "key": "from-dia-3-support",
        "offset": 41.35,
        "opacity": 0
      },
      {
        "key": "from-dia-3-sample-0",
        "offset": 41.351,
        "opacity": 1
      },
      {
        "key": "from-dia-3-sample-1024",
        "offset": 58.66,
        "opacity": 1
      },
      {
        "key": "to-dia-5-sample-1024",
        "offset": 68.27,
        "opacity": 0
      },
      {
        "key": "upper-bound",
        "offset": 100,
        "opacity": 0
      }
    ],
    "segments": [
      {
        "key": "segment-0",
        "pathData": "M 0 240.2434011543014 L 141.22222222222223 240.2434011543014 L 141.22222222222223 659 L 0 659 Z"
      },
      {
        "key": "segment-1",
        "pathData": "M 141.22222222222223 171.7562598291944 L 282.44444444444446 171.7562598291944 L 282.44444444444446 659 L 141.22222222222223 659 Z"
      },
      {
        "key": "segment-2",
        "pathData": "M 282.44444444444446 108.62048245566587 L 423.6666666666667 108.62048245566587 L 423.6666666666667 659 L 282.44444444444446 659 Z"
      },
      {
        "key": "segment-3",
        "pathData": "M 423.6666666666667 52.894937751894076 L 564.8888888888889 52.894937751894076 L 564.8888888888889 659 L 423.6666666666667 659 Z"
      },
      {
        "key": "segment-4",
        "pathData": "M 564.8888888888889 11.980000000000018 L 738.5922222222223 11.980000000000018 L 738.5922222222223 659 L 564.8888888888889 659 Z"
      },
      {
        "key": "segment-5",
        "pathData": "M 738.5922222222223 52.894937751894076 L 879.8144444444445 52.894937751894076 L 879.8144444444445 659 L 738.5922222222223 659 Z"
      },
      {
        "key": "segment-6",
        "pathData": "M 879.8144444444445 108.62048245566587 L 1021.0366666666667 108.62048245566587 L 1021.0366666666667 659 L 879.8144444444445 659 Z"
      },
      {
        "key": "segment-7",
        "pathData": "M 1021.0366666666667 171.75625982919445 L 1162.258888888889 171.75625982919445 L 1162.258888888889 659 L 1021.0366666666667 659 Z"
      },
      {
        "key": "segment-8",
        "pathData": "M 1162.258888888889 240.2434011543014 L 1303.4811111111112 240.2434011543014 L 1303.4811111111112 659 L 1162.258888888889 659 Z"
      }
    ]
  },
  {
    "id": "dia-3",
    "name": "Layer 04",
    "ordinal": "04",
    "color": "#e1ecfe",
    "blur": 15,
    "bounds": {
      "minX": 0,
      "minY": 11.980000000000018,
      "maxX": 1303.4811111111112,
      "maxY": 659
    },
    "style": {
      "durationMs": 1100,
      "revealDistance": 0.65
    },
    "envelope": [
      {
        "key": "lower-bound",
        "offset": 0,
        "opacity": 0
      },
      {
        "key": "from-dia-2-support",
        "offset": 28.37,
        "opacity": 0
      },
      {
        "key": "from-dia-2-sample-0",
        "offset": 28.371000000000002,
        "opacity": 1
      },
      {
        "key": "from-dia-2-sample-1024",
        "offset": 41.35,
        "opacity": 1
      },
      {
        "key": "to-dia-4-sample-1024",
        "offset": 58.66,
        "opacity": 0
      },
      {
        "key": "upper-bound",
        "offset": 100,
        "opacity": 0
      }
    ],
    "segments": [
      {
        "key": "segment-0",
        "pathData": "M 0 240.2434011543014 L 141.22222222222223 240.2434011543014 L 141.22222222222223 659 L 0 659 Z"
      },
      {
        "key": "segment-1",
        "pathData": "M 141.22222222222223 171.7562598291944 L 282.44444444444446 171.7562598291944 L 282.44444444444446 659 L 141.22222222222223 659 Z"
      },
      {
        "key": "segment-2",
        "pathData": "M 282.44444444444446 108.62048245566587 L 423.6666666666667 108.62048245566587 L 423.6666666666667 659 L 282.44444444444446 659 Z"
      },
      {
        "key": "segment-3",
        "pathData": "M 423.6666666666667 52.894937751894076 L 564.8888888888889 52.894937751894076 L 564.8888888888889 659 L 423.6666666666667 659 Z"
      },
      {
        "key": "segment-4",
        "pathData": "M 564.8888888888889 11.980000000000018 L 738.5922222222223 11.980000000000018 L 738.5922222222223 659 L 564.8888888888889 659 Z"
      },
      {
        "key": "segment-5",
        "pathData": "M 738.5922222222223 52.894937751894076 L 879.8144444444445 52.894937751894076 L 879.8144444444445 659 L 738.5922222222223 659 Z"
      },
      {
        "key": "segment-6",
        "pathData": "M 879.8144444444445 108.62048245566587 L 1021.0366666666667 108.62048245566587 L 1021.0366666666667 659 L 879.8144444444445 659 Z"
      },
      {
        "key": "segment-7",
        "pathData": "M 1021.0366666666667 171.75625982919445 L 1162.258888888889 171.75625982919445 L 1162.258888888889 659 L 1021.0366666666667 659 Z"
      },
      {
        "key": "segment-8",
        "pathData": "M 1162.258888888889 240.2434011543014 L 1303.4811111111112 240.2434011543014 L 1303.4811111111112 659 L 1162.258888888889 659 Z"
      }
    ]
  },
  {
    "id": "dia-2",
    "name": "Layer 03",
    "ordinal": "03",
    "color": "#5092c7",
    "blur": 15,
    "bounds": {
      "minX": 0,
      "minY": 11.980000000000018,
      "maxX": 1303.4811111111112,
      "maxY": 659
    },
    "style": {
      "durationMs": 1100,
      "revealDistance": 0.65
    },
    "envelope": [
      {
        "key": "lower-bound",
        "offset": 0,
        "opacity": 0
      },
      {
        "key": "from-dia-1-support",
        "offset": 18.27,
        "opacity": 0
      },
      {
        "key": "from-dia-1-sample-0",
        "offset": 18.271,
        "opacity": 1
      },
      {
        "key": "from-dia-1-sample-1024",
        "offset": 28.37,
        "opacity": 1
      },
      {
        "key": "to-dia-3-sample-1024",
        "offset": 41.35,
        "opacity": 0
      },
      {
        "key": "upper-bound",
        "offset": 100,
        "opacity": 0
      }
    ],
    "segments": [
      {
        "key": "segment-0",
        "pathData": "M 0 240.2434011543014 L 141.22222222222223 240.2434011543014 L 141.22222222222223 659 L 0 659 Z"
      },
      {
        "key": "segment-1",
        "pathData": "M 141.22222222222223 171.7562598291944 L 282.44444444444446 171.7562598291944 L 282.44444444444446 659 L 141.22222222222223 659 Z"
      },
      {
        "key": "segment-2",
        "pathData": "M 282.44444444444446 108.62048245566587 L 423.6666666666667 108.62048245566587 L 423.6666666666667 659 L 282.44444444444446 659 Z"
      },
      {
        "key": "segment-3",
        "pathData": "M 423.6666666666667 52.894937751894076 L 564.8888888888889 52.894937751894076 L 564.8888888888889 659 L 423.6666666666667 659 Z"
      },
      {
        "key": "segment-4",
        "pathData": "M 564.8888888888889 11.980000000000018 L 738.5922222222223 11.980000000000018 L 738.5922222222223 659 L 564.8888888888889 659 Z"
      },
      {
        "key": "segment-5",
        "pathData": "M 738.5922222222223 52.894937751894076 L 879.8144444444445 52.894937751894076 L 879.8144444444445 659 L 738.5922222222223 659 Z"
      },
      {
        "key": "segment-6",
        "pathData": "M 879.8144444444445 108.62048245566587 L 1021.0366666666667 108.62048245566587 L 1021.0366666666667 659 L 879.8144444444445 659 Z"
      },
      {
        "key": "segment-7",
        "pathData": "M 1021.0366666666667 171.75625982919445 L 1162.258888888889 171.75625982919445 L 1162.258888888889 659 L 1021.0366666666667 659 Z"
      },
      {
        "key": "segment-8",
        "pathData": "M 1162.258888888889 240.2434011543014 L 1303.4811111111112 240.2434011543014 L 1303.4811111111112 659 L 1162.258888888889 659 Z"
      }
    ]
  },
  {
    "id": "dia-1",
    "name": "Layer 02",
    "ordinal": "02",
    "color": "#0358f7",
    "blur": 15,
    "bounds": {
      "minX": 0,
      "minY": 11.980000000000018,
      "maxX": 1303.4811111111112,
      "maxY": 659
    },
    "style": {
      "durationMs": 1100,
      "revealDistance": 0.65
    },
    "envelope": [
      {
        "key": "from-dia-0-support",
        "offset": 0,
        "opacity": 0
      },
      {
        "key": "from-dia-0-sample-0",
        "offset": 0.001,
        "opacity": 1
      },
      {
        "key": "from-dia-0-sample-1024",
        "offset": 18.27,
        "opacity": 1
      },
      {
        "key": "to-dia-2-sample-1024",
        "offset": 28.37,
        "opacity": 0
      },
      {
        "key": "upper-bound",
        "offset": 100,
        "opacity": 0
      }
    ],
    "segments": [
      {
        "key": "segment-0",
        "pathData": "M 0 240.2434011543014 L 141.22222222222223 240.2434011543014 L 141.22222222222223 659 L 0 659 Z"
      },
      {
        "key": "segment-1",
        "pathData": "M 141.22222222222223 171.7562598291944 L 282.44444444444446 171.7562598291944 L 282.44444444444446 659 L 141.22222222222223 659 Z"
      },
      {
        "key": "segment-2",
        "pathData": "M 282.44444444444446 108.62048245566587 L 423.6666666666667 108.62048245566587 L 423.6666666666667 659 L 282.44444444444446 659 Z"
      },
      {
        "key": "segment-3",
        "pathData": "M 423.6666666666667 52.894937751894076 L 564.8888888888889 52.894937751894076 L 564.8888888888889 659 L 423.6666666666667 659 Z"
      },
      {
        "key": "segment-4",
        "pathData": "M 564.8888888888889 11.980000000000018 L 738.5922222222223 11.980000000000018 L 738.5922222222223 659 L 564.8888888888889 659 Z"
      },
      {
        "key": "segment-5",
        "pathData": "M 738.5922222222223 52.894937751894076 L 879.8144444444445 52.894937751894076 L 879.8144444444445 659 L 738.5922222222223 659 Z"
      },
      {
        "key": "segment-6",
        "pathData": "M 879.8144444444445 108.62048245566587 L 1021.0366666666667 108.62048245566587 L 1021.0366666666667 659 L 879.8144444444445 659 Z"
      },
      {
        "key": "segment-7",
        "pathData": "M 1021.0366666666667 171.75625982919445 L 1162.258888888889 171.75625982919445 L 1162.258888888889 659 L 1021.0366666666667 659 Z"
      },
      {
        "key": "segment-8",
        "pathData": "M 1162.258888888889 240.2434011543014 L 1303.4811111111112 240.2434011543014 L 1303.4811111111112 659 L 1162.258888888889 659 Z"
      }
    ]
  },
  {
    "id": "dia-0",
    "name": "Layer 01",
    "ordinal": "01",
    "color": "#340b05",
    "blur": 15,
    "bounds": {
      "minX": 0,
      "minY": 11.980000000000018,
      "maxX": 1303.4811111111112,
      "maxY": 659
    },
    "style": {
      "durationMs": 1100,
      "revealDistance": 0.65
    },
    "envelope": [
      {
        "key": "lower-bound",
        "offset": 0,
        "opacity": 1
      },
      {
        "key": "to-dia-1-sample-1024",
        "offset": 18.27,
        "opacity": 0
      },
      {
        "key": "upper-bound",
        "offset": 100,
        "opacity": 0
      }
    ],
    "segments": [
      {
        "key": "segment-0",
        "pathData": "M 0 240.2434011543014 L 141.22222222222223 240.2434011543014 L 141.22222222222223 659 L 0 659 Z"
      },
      {
        "key": "segment-1",
        "pathData": "M 141.22222222222223 171.7562598291944 L 282.44444444444446 171.7562598291944 L 282.44444444444446 659 L 141.22222222222223 659 Z"
      },
      {
        "key": "segment-2",
        "pathData": "M 282.44444444444446 108.62048245566587 L 423.6666666666667 108.62048245566587 L 423.6666666666667 659 L 282.44444444444446 659 Z"
      },
      {
        "key": "segment-3",
        "pathData": "M 423.6666666666667 52.894937751894076 L 564.8888888888889 52.894937751894076 L 564.8888888888889 659 L 423.6666666666667 659 Z"
      },
      {
        "key": "segment-4",
        "pathData": "M 564.8888888888889 11.980000000000018 L 738.5922222222223 11.980000000000018 L 738.5922222222223 659 L 564.8888888888889 659 Z"
      },
      {
        "key": "segment-5",
        "pathData": "M 738.5922222222223 52.894937751894076 L 879.8144444444445 52.894937751894076 L 879.8144444444445 659 L 738.5922222222223 659 Z"
      },
      {
        "key": "segment-6",
        "pathData": "M 879.8144444444445 108.62048245566587 L 1021.0366666666667 108.62048245566587 L 1021.0366666666667 659 L 879.8144444444445 659 Z"
      },
      {
        "key": "segment-7",
        "pathData": "M 1021.0366666666667 171.75625982919445 L 1162.258888888889 171.75625982919445 L 1162.258888888889 659 L 1021.0366666666667 659 Z"
      },
      {
        "key": "segment-8",
        "pathData": "M 1162.258888888889 240.2434011543014 L 1303.4811111111112 240.2434011543014 L 1303.4811111111112 659 L 1162.258888888889 659 Z"
      }
    ]
  }
];

export function SombraGradient({ className, style }: SombraGradientProps) {
  const instanceId = useId().replace(/:/g, "");
  const layerRefs = useRef<Record<string, SVGGElement | null>>({});

  useEffect(() => {
    const mediaQuery = getReducedMotionQuery();
    const animationFrame = getAnimationFrameApi();
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;
    let completionTimers: number[] = [];

    const clearScheduled = () => {
      if (firstFrame !== null) animationFrame?.cancel(firstFrame);
      if (secondFrame !== null) animationFrame?.cancel(secondFrame);
      completionTimers.forEach((completionTimer) => window.clearTimeout(completionTimer));
      firstFrame = null;
      secondFrame = null;
      completionTimers = [];
    };
    const complete = () => {
      clearScheduled();
      LAYERS.forEach((layer) => {
        const element = layerRefs.current[layer.id];
        if (!element) return;
        element.style.transition = "";
        element.style.transform = "scaleY(1)";
        element.style.willChange = "";
      });
    };
    const start = () => {
      clearScheduled();
      if (!mediaQuery || !animationFrame || mediaQuery.matches) {
        complete();
        return;
      }
      LAYERS.forEach((layer) => {
        const element = layerRefs.current[layer.id];
        if (!element) return;
        element.style.transition = "";
        element.style.transform = "scaleY(0)";
        element.style.willChange = "transform";
      });
      firstFrame = animationFrame.request(() => {
        secondFrame = animationFrame.request(() => {
          LAYERS.forEach((layer) => {
            const element = layerRefs.current[layer.id];
            if (!element) return;
            element.style.transition = `transform ${layer.style.durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`;
            element.style.transform = "scaleY(1)";
            completionTimers.push(window.setTimeout(() => {
              element.style.transition = "";
              element.style.willChange = "";
            }, layer.style.durationMs));
          });
        });
        if (secondFrame === null) complete();
      });
      if (firstFrame === null) complete();
    };

    if (!mediaQuery || !animationFrame) {
      complete();
      return;
    }
    const unsubscribe = subscribeToReducedMotion(mediaQuery, start);
    if (!unsubscribe) {
      complete();
      return;
    }
    start();
    return () => {
      clearScheduled();
      unsubscribe();
      LAYERS.forEach((layer) => {
        const element = layerRefs.current[layer.id];
        if (element) element.style.willChange = "";
      });
    };
  }, []);

  return (
    <div
      data-sombra-gradient-anchor=""
      aria-hidden="true"
      className={className}
      style={{ ...style, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <svg
        viewBox="0 0 1271 599"
        preserveAspectRatio="none"
        fill="none"
        width="100%"
        height="100%"
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        {LAYERS.length > 0 && (
          <defs>
            {LAYERS.map((layer) => {
              const prefix = `sombra-${instanceId}-layer-${layer.ordinal}`;
              const gradientId = `${prefix}-fill`;
              const filterId = `${prefix}-blur`;
              const padding = layer.blur * 4;
              return (
                <g key={layer.id}>
                  <linearGradient id={gradientId} gradientUnits="objectBoundingBox" x1="0" y1="1" x2="0" y2="0">
                    {layer.envelope.map((stop) => (
                      <stop key={stop.key} data-gradient-stop-key={`${layer.id}:${stop.key}`} offset={`${stop.offset}%`} stopColor={layer.color} stopOpacity={stop.opacity} />
                    ))}
                  </linearGradient>
                  <filter
                    id={filterId}
                    data-gradient-layer-filter={layer.id}
                    filterUnits="userSpaceOnUse"
                    x={layer.bounds.minX - padding}
                    y={layer.bounds.minY - padding}
                    width={layer.bounds.maxX - layer.bounds.minX + padding * 2}
                    height={layer.bounds.maxY - layer.bounds.minY + padding * 2}
                  >
                    <feGaussianBlur stdDeviation={layer.blur} />
                  </filter>
                </g>
              );
            })}
          </defs>
        )}
        {LAYERS.map((layer) => {
          const prefix = `sombra-${instanceId}-layer-${layer.ordinal}`;
          const gradientId = `${prefix}-fill`;
          const filterId = `${prefix}-blur`;
          return (
            <g
              id={prefix}
              key={layer.id}
              ref={(element) => {
                layerRefs.current[layer.id] = element;
              }}
              data-name={layer.name}
              data-gradient-layer={layer.id}
              data-sombra-layer-id={layer.id}
              data-gradient-id={gradientId}
              data-filter-id={filterId}
              style={{
                pointerEvents: "none",
                transformBox: "view-box",
                transformOrigin: "50% 100%",
                transform: "scaleY(0)",
              }}
            >
              <g
                id={`${prefix}-artwork`}
                data-name="Artwork"
                data-gradient-artwork=""
                fill={`url(#${gradientId})`}
                filter={`url(#${filterId})`}
                opacity={1}
              >
                {layer.segments.map((segment, index) => {
                  const ordinal = String(index + 1).padStart(2, "0");
                  return (
                    <path
                      id={`${prefix}-segment-${ordinal}`}
                      key={segment.key}
                      data-name={`Segment ${ordinal}`}
                      data-gradient-segment={segment.key}
                      d={segment.pathData}
                    />
                  );
                })}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

