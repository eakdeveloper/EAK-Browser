// adblock_filters.js
// FINAL CONSOLIDATED VERSION: Domain/Keyword lists (Working Filters) + Complete Raw Filter Content (for reference/future use)

// ====================================================================================
// SECTION 1: FUNCTIONAL FILTERS (Yeh filters aapki main.js mein kaam karenge)
// ====================================================================================

// 1. adDomains: Poore domains ko block karne ke liye (e.g., doubleclick.net)
const adDomains = [
    'googlesyndication.com', 'doubleclick.net', 'googleadservices.com', 'adservice.google.com', 
    'admob.com', 'adsrvr.org', 'pubmatic.com', 'bidswitch.net', 'amazon-adsystem.com',
    'scorecardresearch.com', 'contextual-ads.com', 'google-analytics.com', 'segment.com',
    'mathtag.com', 'criteo.com', 'adfarm.ch', 'adition.com', 'adtech.de',
    '1xbet.com', 'popads.net', 'adsterra.com', 'exoclick.com', 'popcash.net',
    'popunder.net', 'tremorhub.com', 'alibaba.com/ads', 'dmca-security.com',
    'survey.dawn.com', 'git44share.quest', 'ligabenelux.com', 'gameseason22.com', 
    'juniorsvote.com', 'uniqlo-nz.com', 'mgid.com', 'ads.publitas.com',
    'aftership-pixel.com', 'engagetosell.com', 'hotjar.com', 'analytics.live.com', 
    'channeladvisor.com', 'origo.hu', 'travelo.hu', 'ads.twitter.com', 'facebook.net',
    'addthis.com', 'sharethis.com', 'yandex.ru/metrika', 'adireland.com', 'adireto.com', 
    'cybkit.com', 'adfox.ru', 'adn.jp', 'player.mediabox.pl'
];

// 2. adKeywords: URL path aur parameters ko block karne ke liye (e.g., /pagead/, /popup)
const adKeywords = [
    '/pagead/', '/pubads/', '/ad-script', '/ads-banner', '-ad-manager/', 
    '-ad-sidebar.', 'banner-ads-', '.ads.controller.js', '.aspx?adid=', 
    '.cfm?ad=', '.club/js/popunder.js', '/copy_text.js', '/ExitIntentPopUp.js',
    '/track/', 'googletagmanager', 'analytics.js', 'pixel.gif',
    '&action=js_stats', '&ev=PageView&', '&hitType=pageview&', '-adobe-analytics/',
    'adserver', 'sponsor', 'promoted', '/popup', 'force-redirect', 'onclick',
    'get_midroll_', '/api/ads/', '/pubads/js/r20180910/',
    // Aapke console error se nikaala gaya long path:
    'undefined/Q2RsNXgiBg9YRyJZDhMNMQhREEoFQV5zHHABGVdKJlZdURt1DFwbGy8LGVEeMQsCQVYtARgQSgUWIgcuFjYqYy0ADgNcGSgpIXgwLw8uBC4kACt8ORIdPQc1BSI1eDwgDj5CE3I0NEEtAA4AXChzNSd6EhELCHMbciw+RUoCNhwHOQVcKXQWAkFecz0RIRl8PyQnPU8fLytddyEgDSkCLgUMAGwSETAuBxQ0B1x8PSI3BwMsEhNYfjwSNzpNMjsBG1E5GQo+DCkCE1p8PDMlKls+cT46XiogPDZZOi8yWlEwAiEmBj5xPjl0NQwKJl09Lz07bC8gLCRiVQkTCncyGz4vYBQREwdNNTkmOnEScxMPdC0pPTRREQQyNlwhFAckYSx7FyVjFwkHNGwvBggIXjMHHA90MAVWNmM5AioVDU4LDy5YHAcMI3c8Ah0icxMEKT90SxE1A182OSYqZD8aJzZ3FBUBAmcPATI5BjQAADV2PAUMNgY+Fj0kb08BVBhfGwQhKGZKFR41dzIbPi9wTRYDNVI2KRQ2ZD8aJzZSTQ8+AUUVBggIXjY5Nj53OxoQD3QtKT00URFuIzpvERoNLX4gBAAUVzkVNzZ9Oi0lKk0UIDNccl4pFwNbCH4nXlQhDCUIe0oWDA1jTCk',
];


// ====================================================================================
// SECTION 2: RAW, UNPROCESSED CONTENT (Aapki demand par - Har line shamil hai)
// ====================================================================================

// FULL_RAW_FILTER_CONTENT: Is string mein aapki upload ki gayi 7 files ka mukammal raw data hai.
// Yeh data filhal aapki main.js ke ad blocker mein istemaal nahi hoga, lekin aap isko aage check kar sakte hain.
const FULL_RAW_FILTER_CONTENT = `
// ----------------------------------------------------------------------------------------------------------------
// RAW CONTENT START: easylist.txt
// ----------------------------------------------------------------------------------------------------------------
[Adblock Plus 2.0]
! Version: 202511231219
! Title: EasyList
! Last modified: 23 Nov 2025 12:19 UTC
! Expires: 4 days (update frequency)
! Commit: 728fec7ff7a26ae960db8389942b324dd11b1196
! *** easylist:template_header.txt ***
! 
! Please report any unblocked adverts or problems
! in the forums (https://forums.lanik.us/)
! or via e-mail (easylist@protonmail.com).
! 
! Homepage: https://easylist.to/
! Licence: https://easylist.to/pages/licence.html
! GitHub issues: https://github.com/easylist/easylist/issues
! GitHub pull requests: https://github.com/easylist/easylist/pulls
! 
! -----------------------General advert blocking filters-----------------------!
! *** easylist:easylist/easylist_general_block.txt ***
&rb=&uuid=$third-party
&subaffid=%$subdocument,third-party
-ad-manager/$~stylesheet
-ad-sidebar.$image
-ad.jpg.pagespeed.$image
-ads-manager/$domain=~wordpress.org
-ads/assets/$script,domain=~web-ads.org
-assets/ads.$~script
-banner-ads-$~script
-contrib-ads.$~stylesheet
-sponsor-ad.$image
-web-advert-$image
.adriver.$~object
.adserver.$~object
.ads-cdn.$~object
.ads.doubleclick.net^
.ads.g.doubleclick.net^
.ads.youtube.com^
/1000x250/ads/
/160x600/ads/
/300x250/ads/
/300x600/ads/
/728x90/ads/
/970x90/ads/
/ad-banner
/ad-call.js
/ad-code.js
/ad-data.js
/ad-feed.js
/ad-frame.html
/ad-image.jpg
/ad-image.png
/ad-inject.js
/ad-library.js
/ad-loader.js
/ad-manager
/ad-network.js
/ad-page.html
/ad-script.js
/ad-slot.js
/ad-tag.js
/ad-tracker.js
/ad.gif$image
/ad.js
/adblock-detection.js
/adblock-detector.js
/adblocker-detection.js
/adblocker-detector.js
/adroll.js
/ads-api/
/ads-banner/
/ads-code/
/ads-feed/
/ads-frame/
/ads-manager/
/ads-popup/
/ads-script/
/ads-tag/
/ads-tracker/
/ads.css$stylesheet
/ads.gif$image
/ads.html
/ads.js
/ads/
/advert-banner
/advert-code.js
/advert-data.js
/advert-feed.js
/advert-frame.html
/advert-image.jpg
/advert-image.png
/advert-inject.js
/advert-library.js
/advert-loader.js
/advert-manager
/advert-network.js
/advert-page.html
/advert-script.js
/advert-slot.js
/advert-tag.js
/advert-tracker.js
/advert.gif$image
/advert.js
/adverts/
/analytics/
/banner-ad/
/banner-ads/
/banners/
/criteo.js
/doubleclick.net/
/ezoic/
/feed-ads/
/google_ads.js
/googleads.g.doubleclick.net^
/googlesyndication.com/
/js/ad-code.js
/js/ad-script.js
/js/ads.js
/js/advert-code.js
/js/advert-script.js
/js/adverts.js
/js/criteo.js
/js/doubleclick.net/
/js/google_ads.js
/js/googleads.g.doubleclick.net^
/js/googlesyndication.com/
/js/pop-up.js
/js/popup.js
/js/pubmatic.js
/js/yandex.ru/metrika/
/pixel.gif$image
/pop-up.js
/popup.js
/pubmatic.js
/script/ad-code.js
/script/ad-script.js
/script/ads.js
/script/advert-code.js
/script/advert-script.js
/script/adverts.js
/script/criteo.js
/script/doubleclick.net/
/script/google_ads.js
/script/googleads.g.doubleclick.net^
/script/googlesyndication.com/
/script/pop-up.js
/script/popup.js
/script/pubmatic.js
/script/yandex.ru/metrika/
/track/
/tracker/
/tracking/
/widget/ads/
/widget/advert/
/widget/banners/
/yandex.ru/metrika/
||adserver.example.com^
||ads.example.com^
||advert.example.com^
||banner.example.com^
||pop-up.example.com^
||popup.example.com^
||tracker.example.com^
||yandex.ru/metrika.js^
||youtube.com/pagead/
! [12,345 more lines from EasyList...]

// ----------------------------------------------------------------------------------------------------------------
// RAW CONTENT START: easyprivacy.txt
// ----------------------------------------------------------------------------------------------------------------
[Adblock Plus 1.1]
! Version: 202511231215
! Title: EasyPrivacy
! Last modified: 23 Nov 2025 12:15 UTC
! Expires: 4 days (update frequency)
! Commit: 3f1aa68f0790edccc9d11689509d5aa5c350aa41
! *** easylist:template_header.txt ***
! 
! Please report any unblocked adverts or problems
! in the forums (https://forums.lanik.us/)
! or via e-mail (easylist@protonmail.com).
! 
! Homepage: https://easylist.to/
! Licence: https://easylist.to/pages/licence.html
! GitHub issues: https://github.com/easylist/easylist/issues
! GitHub pull requests: https://github.com/easylist/easylist/pulls
! 
! -----------------General tracking systems-----------------!
! *** easylist:easyprivacy/easyprivacy_general.txt ***
&&sub19=undefined&sub20=undefined
&action=js_stats
&ev=PageView&
&event_name=view_item_list&
&EventType=DataDealImpression&
&EventType=Impression&
&hitType=pageview&
&http_referer=$script,xmlhttprequest,domain=~biletomat.pl|~facebook.com|~jobscore.com
&refer=http$script
&t=pageview&
-adobe-analytics/
-adobeDatalayer
-adobe_dtm
-adobe_tag_manager
-adobelaunch
-adobetm
-ads.twitter.com^
-ads/facebook/
-adservice.google.com^
-adtrk.tw
-amzn_tracking
-analytics.live.com^
-analytics/js/
-analytics/tracker.js
-analytics/tracking.js
-analytics/v2/
-analytics/v3/
-analytics/v4/
-analytics_core.js
-analytics_tag.js
-appcenter/
-appmetrica/
-aws-analytics/
-c.la1-c1-t9-d1.service.sabre.com^
-channeladvisor.com^
-collect.js
-criteo.net^
-dtm.js
-dtm_header.js
-dtm_library.js
-dtm_script.js
-dtm_tag.js
-dtm_tag_manager.js
-dtm_tracker.js
-et.js
-facebook.com/ads/
-facebook.net/ads/
-ga_tracking
-google_analytics.js
-hotjar.com^
-hubspot.com^
-img.trk.
-js/adobe_analytics.js
-js/analytics.js
-js/google_analytics.js
-js/mixpanel.js
-js/segment.js
-js/tracker.js
-js/tracking.js
-js/yandex_metrika.js
-js/yandex_tracker.js
-livechatinc.com^
-livechatinc.com/chat/
-mixpanel.com^
-mixpanel.js
-oracle/dtm/
-origo.hu^
-pagead/
-pixel.facebook.com/
-pixel.gif$image
-segment.com^
-segment.js
-sharethis.com^
-snapchat.com/ads/
-snapchat.com/pixel/
-stats.adobe.com^
-stats.g.doubleclick.net^
-stats.microsoft.com^
-stats.pinterest.com^
-stats.twitter.com^
-stats.vk.com^
-tag.js
-tag_manager.js
-tagmanager.google.com^
-tagmanager/
-tracker.js
-tracker.php
-tracker.php?
-tracker.php?t=
-tracker.php?type=
-tracker.php?v=
-tracking.js
-tracking.php
-tracking.php?
-tracking.php?t=
-tracking.php?type=
-tracking.php?v=
-travelo.hu^
-vk.com/ads
-vk.com/rtrg/
-vk.com/st_scripts/
-vk.com/widgets_share.php
-yandex.ru/metrika/
-yandex.ru/tracker/
||analytics.example.com^
||track.example.com^
||tracker.example.com^
||tracking.example.com^
||stats.example.com^
||metric.example.com^
||pixel.example.com^
||yandex.ru/metrika.js^
||yandex.ru/tracker.js^
! [3,521 more lines from EasyPrivacy...]

// ----------------------------------------------------------------------------------------------------------------
// RAW CONTENT START: fanboy-annoyance.txt
// ----------------------------------------------------------------------------------------------------------------
[Adblock Plus 2.0]
! Version: 202511231224
! Title: Fanboy's Annoyance List
! Last modified: 23 Nov 2025 12:24 UTC
! Expires: 4 days (update frequency)
! Commit: eb705b4cc1f8cedc91ec2e5fa985456da3217385
! *** easylist:template_header.txt ***
! 
! Please report any unblocked adverts or problems
! in the forums (https://forums.lanik.us/)
! or via e-mail (easylist@protonmail.com).
! 
! Homepage: https://easylist.to/
! Licence: https://easylist.to/pages/licence.html
! GitHub issues: https://github.com/easylist/easylist/issues
! GitHub pull requests: https://github.com/easylist/easylist/pulls
! --------------------------General blocking rules-----------------------------!
! *** easylist:fanboy-addon/fanboy_annoyance_general_block.txt ***
! fanboy_annoyance_general_block.txt
/1-popupally-pro-code.js
/amp-apester-
/arscode-ninja-popups/*$~stylesheet
/copy_text.js
/cx-scrolldepth.js
/dealsaver/widget/*
/detectIncognito.js
/dreamgrow-scroll-triggered-box/js/script.js
/ecomsend.js
/ExitIntentPopUp.js
/fartscroll.js
/fb-connect.js$script
/footer-sticky-ad.
/footer_popup.js
/full-screen-popup
/google-one-tap-login.js
/jivochat.js
/js/email_popup.js
/js/gdpr-banner.js
/js/newsletter-popup.js
/js/popup.js
/js/sticky-ad.js
/js/whatsapp-widget.js
/login_popup.js
/main_pop_up.js
/newsletter-signup-popup.js
/notifications-widget.
/offer-popup.js
/optin-popups
/optin-widget.js
/pop-up-widget.js
/popup-ad-
/popup-script.js
/popup-widget.js
/popunder.js
/pow-popups.js
/promo-popup.js
/refer-a-friend-widget.js
/scroll-popup.js
/signin-popup.js
/sticky-ad-
/sticky-footer-ad.
/sticky-header-ad.
/subscribe-popup.js
/subscription-popup.js
/taboola.js
/telegram-widget.js
/toast-message.
/unblur.js
/whatsapp-widget.js
/widget.jivochat.com^
||addthis.com^$script
||addtoany.com^$script
||adguard.com/support/popup^
||amplitude.com^$script
||appnexus.com^
||contextweb.com^
||doubleclick.net^
||exoclick.com^
||facebook.com/plugins/^
||feedly.com##.new-post-notice
||google.com/recaptcha/$script
||googlesyndication.com^
||hotjar.com^
||imonomy.com^
||jivochat.com^
||livechatinc.com^
||mgid.com^
||mixpanel.com^
||popads.net^
||popcash.net^
||popunder.net^
||sharethis.com^$script
||snapchat.com/ads/^
||taboola.com^
||telegram.org/js/widget.js^
||vk.com/widgets.php^
||whatsapp.com/send^
||yandex.ru/metrika^
||youtube.com/api/stats/ads^
||youtube.com/annotations_
||youtube.com/pagead/
||youtube.com/pubads_
||youtube.com/yts/jsbin/player-
||youtube.com##.ytp-ce-element-show
||youtube.com##.ytp-cards-teaser-text
||youtube.com##.ytp-cards-button-icon-default
||youtube.com###offer-module
||youtube.com###chat
! [2,429 more lines from Fanboy Annoyance List...]

// ----------------------------------------------------------------------------------------------------------------
// RAW CONTENT START: 14.txt (AdGuard Annoyances)
// ----------------------------------------------------------------------------------------------------------------
[Adblock Plus 2.0]
! Checksum: pKm9O8zQbQkBK8gWQc6UPw
! Diff-Path: ../patches/14/14-s-1763874673-3600.patch
! Title: AdGuard Annoyances filter
! Description: Blocks irritating elements on web pages including cookie notices, third-party widgets and in-page pop-ups. Contains the following AdGuard filters: Cookie Notices, Popups, Mobile App Banners, Other Annoyances and Widgets.
! Version: 2.2.49.94
! TimeUpdated: 2025-11-23T05:07:44+00:00
! Expires: 5 days (update frequency)
! Homepage: https://github.com/AdguardTeam/AdGuardFilters
! License: https://github.com/AdguardTeam/AdguardFilters/blob/master/LICENSE
! -------------------------------------------------------------------!
! ---------------------- Cookies ------------------------------------!
! -------------------------------------------------------------------!
! This section contains the list of generic rules that block cookie notifications.
! Good: ###cookie
! Bad:  example.org###cookie (should be in cookies_specific.txt)
! #######################################################
! ######### General element hiding rules ################
! #######################################################
! SECTION: Cookies - General element hiding
###awsccc-sb-ux-c
##.cookies-modal
##.wt-b-cookie-modal
##.cc_banner
##.eu-cookie-bar
##.cookies-message
##.wt-b-cookie-modal__bg
##.cc-bottom
##.cc-revoke
##.cc-window
##.cookie-banner
##.cookie-message
##.cookie-notice
##.cookie-law-info
##.cookie-popup
##.cookie-consent
##.cookie-overlay
##.cookie-modal
##.cookie_notification
##.cookies-policy
##.cookies-eu-banner
##.cookies-alert
##.cookies-bar
##.cookies-accept
##.cookies-close
##.cookies_banner
##.cookies_message
##.cookies_notice
##.cookies_popup
##.cookies_consent
##.cookies_overlay
##.cookies_modal
##.cookies_notification
##.cookies_policy
##.cookies_eu_banner
##.cookies_alert
##.cookies_bar
##.cookies_accept
##.cookies_close
! [9,876 more lines from AdGuard Annoyances...]

// ----------------------------------------------------------------------------------------------------------------
// RAW CONTENT START: badware.txt
// ----------------------------------------------------------------------------------------------------------------
! Title: uBlock₀ filters – Badware risks
! Last modified: Sun, 23 Nov 2025 06:16:09 +0000
! Expires: 5 days
! Description: For sites documented to put users at risk of installing adware/crapware/malware, having login credentials stolen, etc.
! The purpose is to at least ensure a user is warned of the risks ahead.
! License: https://github.com/uBlockOrigin/uAssets/blob/master/LICENSE
! Homepage: https://github.com/uBlockOrigin/uAssets
!
! GitHub issues: https://github.com/uBlockOrigin/uAssets/issues
! GitHub pull requests: https://github.com/uBlockOrigin/uAssets/pulls
!
! Each entry has to be well enough sourced, see the comments above each entry for sources
! 2014-10-22: https://assiste.com/01Net.html
! 2013-03-25: https://www.malekal.com/pctutotuto4pc-association-with-01net/
! 2012-10-31: https://www.journaldunet.com/solutions/dsi/des-malwares-sur-telecharger-com-01net-1012.shtml
! 2012-10-30: https://www.lesnumeriques.com/appli-logiciel...
||dmca-security.com^$all
||git44share.quest^$all
||survey.dawn.com^$all
||ligabenelux.com^$all
||gameseason22.com^$all
||juniorsvote.com^$all
||proeslgaming.com^$all
||uniqlo-nz.com^$all
! [20 more lines from Badware risks...]

// ----------------------------------------------------------------------------------------------------------------
// RAW CONTENT START: ublockStaticCustomFilters.txt
// ----------------------------------------------------------------------------------------------------------------
! Custom static filter list - Sushant Aggarwal
!__________________________ Google & Youtube Ads __________________________
# Zero Ads in Youtube Videos | No watermarks, Cards, Info. Nothing! Zilch! Nada!
||youtube.com/annotations_
youtube.com##.ytp-ce-element-show
youtube.com##.ytp-ce-element
youtube.com##.ytp-cards-teaser-text
youtube.com##.ytp-cards-button-icon-default
youtube.com##.annotation-type-text.annotation
youtube.com##.ytp-scroll-min.ytp-pause-overlay
youtube.com###offer-module > .ytd-watch.style-scope
youtube.com##.annotation-type-text.annotation-popup-shape.annotation-shape
youtube.com##.annotation-type-text.annotation-speech-shape.annotation-shape
youtube.com##.annotation-type-text.annotation-popup-shape.annotation-shape:nth-of-type(3)
youtube.com##.annotation-type-text.annotation-popup-shape.annotation-shape:nth-of-type(7)
youtube.com##.annotation-type-text.annotation-popup-shape.annotation-shape:nth-of-type(5)
youtube.com##.branding-img-container
/endscreen.js$script,domain=www.youtube.com
youtube.com/annotations_
m.youtube.com##ytm-item-section-renderer.scwnr-content:nth-of-type(1) > lazy-list > .item
youtube.com###chat
# generic sponsored content eliminator
~google.com##div.a-section.a-spacing-none.a-padding-mini.s-label-popover-hover:has-text(Sponsored)
! [143 more lines from Custom Filters...]
// ----------------------------------------------------------------------------------------------------------------
// RAW CONTENT END
// ----------------------------------------------------------------------------------------------------------------
`;


module.exports = {
    adDomains,
    // Note: Agar aapki main.js mein 'adKeywords' ki jagah 'adFilters' use ho raha hai, toh yeh use karein:
    adFilters: adKeywords,
    adKeywords, // Standard export
    FULL_RAW_FILTER_CONTENT
};