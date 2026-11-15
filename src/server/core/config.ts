// Reddit only lets an app act as the player (comment, join) for everyone once the app has
// passed review. Before that, the action runs as the player for the app owner and as the
// app account for everybody else, which breaks Reddit's score-sharing rule and our own
// wording. Flip this to true only after Reddit approves a published version.
export const USER_ACTIONS_APPROVED = false;

// The app owner's Reddit username, who can exercise user actions before approval.
export const OWNER_USERNAME = 'AIZOYA';

export const canUseUserActions = (username: string | undefined): boolean =>
  USER_ACTIONS_APPROVED ||
  (username !== undefined &&
    username.toLowerCase() === OWNER_USERNAME.toLowerCase());

// Stored player data expires on its own, so deleted accounts do not linger in Redis.
export const PLAYER_DATA_TTL_SECONDS = 30 * 24 * 60 * 60;
