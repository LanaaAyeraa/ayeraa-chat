declare module "canvas-confetti";

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: { credential: string }) => void;
          auto_select?: boolean;
          cancel_on_tap_outside?: boolean;
        }) => void;
        renderButton: (
          parent: HTMLElement,
          options: {
            theme?: "outline" | "filled_blue" | "filled_black";
            size?: "large" | "medium" | "small";
            text?: string;
            shape?: "rectangular" | "pill" | "circle" | "square";
            width?: number | string;
          }
        ) => void;
        prompt: (momentListener?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
      };
    };
  };
  AYERAA_GOOGLE_CLIENT_ID?: string;
}
