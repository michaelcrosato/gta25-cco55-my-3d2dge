# UI audit

`node tools/ui-audit.mjs` (PLAN.md 8.18): 238 stops, 238 pass.

| Pass | Size | Stops | Pass | Failures |
|---|---|---|---|---|
| pad | 1920x1080 | 51 | 51 | — |
| keys | 1920x1080 | 51 | 51 | — |
| mouse | 1920x1080 | 17 | 17 | — |
| pad | 1280x720 | 51 | 51 | — |
| keys | 1280x720 | 51 | 51 | — |
| mouse | 1280x720 | 17 | 17 | — |

## Stops

| Stop | Screen | Lists |
|---|---|---|
| title | title | title 5 (1/1) |
| settings-controls | settings | settings-controls 6 (1/2) |
| settings-controls-2 | settings | settings-controls 3 (2/2) |
| settings-display | settings | settings-display 6 (1/2) |
| settings-audio | settings | settings-audio 6 (1/2) |
| settings-game | settings | settings-game 4 (1/1) |
| settings-access | settings | settings-access 5 (1/1) |
| settings-display-2 | settings | settings-display 5 (2/2) |
| layout-onfoot | layout | — |
| layout-vehicle | layout | — |
| rebind-onfoot | rebind | rebind-onFoot 6 (1/4) |
| rebind-onfoot-2 | rebind | rebind-onFoot 6 (2/4) |
| rebind-onfoot-3 | rebind | rebind-onFoot 6 (3/4) |
| rebind-capture | rebind | rebind-onFoot 6 (3/4) |
| rebind-defaults | confirm | rebind-onFoot 6 (3/4), confirm 2 (1/1) |
| title-again | title | title 5 (1/1) |
| load | slots-load | slots 4 (1/1) |
| extras | extras | extras 3 (1/1) |
| credits | credits | — |
| credits-2 | credits | — |
| credits-3 | credits | — |
| credits-4 | credits | — |
| help | help | guide 6 (1/2) |
| help-page | guide-page | — |
| help-page-2 | guide-page | — |
| title-last | title | title 5 (1/1) |
| hud-roam | (the HUD) | — |
| pause-map | pause | — |
| pause-map-legend | pause | — |
| pause-map-waypoint | pause | — |
| pause-brief | pause | brief 2 (1/1) |
| quit-confirm | confirm | brief 2 (1/1), confirm 2 (1/1) |
| pause-stats | pause | stats 6 (1/2) |
| pause-stats-2 | pause | stats 4 (2/2) |
| pause-settings | pause | pause-settings 5 (1/1) |
| pause-settings-controls | settings | settings-controls 6 (1/2) |
| pause-help | pause | guide 6 (1/2) |
| resumed | (the HUD) | — |
| phone | phone | card-phone 5 (1/1) |
| phone-contacts | contacts | card-contacts 1 (1/1) |
| phone-cabs | cabs | card-cabs 6 (1/5) |
| phone-texts | texts | — |
| phone-jobs | jobs | — |
| shop | shop | card-shop 2 (1/1) |
| save | slots-save | slots 3 (1/1) |
| job-card | job | card-job 2 (1/1) |
| hud-mission | (the HUD) | — |
| job-blown | blown | card-blown 2 (1/1) |
| job-done | done | — |
| weapon-wheel | (the HUD) | — |
| wrecked | (the HUD) | — |
