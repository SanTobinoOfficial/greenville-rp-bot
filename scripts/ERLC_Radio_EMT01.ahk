; ============================================================
;  ER:LC Custom Radio — EMT-01
;  AutoHotkey v1  |  Tier 3 Matchmaking
; ============================================================
;
;  NUMPAD HOTKEYS (działają tylko gdy Roblox jest aktywny):
;
;  Numpad1  →  En Route Code 3
;  Numpad2  →  10-23 On Scene
;  Numpad3  →  10-8 Available
;  Numpad4  →  10-45A (Good)
;  Numpad5  →  10-45B (Serious)
;  Numpad6  →  10-45C (Critical)
;  Numpad7  →  10-45D (Deceased)
;  Numpad8  →  Transporting to RCGH
;  Numpad9  →  10-24 Leaving Scene
;  Numpad0  →  Panic / Request Backup
;  NumpadDot →  Otwiera radio + prefix, ty piszesz resztę
;
;  Ctrl+F12 →  Pokaż/ukryj ten cheatsheet
; ============================================================

#NoEnv
#SingleInstance Force
SetWorkingDir %A_ScriptDir%
SendMode Input

; --- USTAWIENIA ---
Callsign   := "EMT-01"
RadioDelay := 180        ; ms czekania na otwarcie chatu (zwiększ jeśli lag)

; --- FUNKCJA WYSYŁANIA ---
SendRadio(msg) {
    global RadioDelay
    Send {t}
    Sleep, %RadioDelay%
    SendInput, %msg%
    Sleep, 60
    Send {Enter}
}

; ============================================================
;  HOTKEYS — tylko gdy Roblox aktywny
; ============================================================
#IfWinActive ahk_exe RobloxPlayerBeta.exe

; Numpad1 — En Route
Numpad1::
    SendRadio(Callsign . " — responding, en route Code 3.")
return

; Numpad2 — On Scene
Numpad2::
    SendRadio(Callsign . " — 10-23, on scene.")
return

; Numpad3 — Available / Back in Service
Numpad3::
    SendRadio(Callsign . " — 10-8, available.")
return

; Numpad4 — 10-45A Patient Good
Numpad4::
    SendRadio(Callsign . " — 10-45 Alpha, patient condition good.")
return

; Numpad5 — 10-45B Patient Serious
Numpad5::
    SendRadio(Callsign . " — 10-45 Bravo, patient condition serious.")
return

; Numpad6 — 10-45C Patient Critical
Numpad6::
    SendRadio(Callsign . " — 10-45 Charlie, patient condition critical.")
return

; Numpad7 — 10-45D Patient Deceased
Numpad7::
    SendRadio(Callsign . " — 10-45 Delta, patient is deceased.")
return

; Numpad8 — Transporting to RCGH
Numpad8::
    SendRadio(Callsign . " — leaving scene, transporting to RCGH Code 3.")
return

; Numpad9 — 10-24 Leaving Scene
Numpad9::
    SendRadio(Callsign . " — 10-24, clearing scene, 10-8.")
return

; Numpad0 — Panic / Request Backup
Numpad0::
    SendRadio(Callsign . " — requesting immediate backup, officer/unit down! 10-99!")
return

; NumpadDot — Otwiera radio z prefixem, ty dopisujesz resztę
NumpadDot::
    Send {t}
    Sleep, %RadioDelay%
    SendInput, % Callsign . " — "
    ; NIE wysyła Entera — sam piszesz i wysyłasz
return

; NumpadEnter — Szybkie OOC
NumpadEnter::
    Send {t}
    Sleep, %RadioDelay%
    SendInput, % "("
    ; Piszesz OOC i kończysz ")"
return

#IfWinActive

; ============================================================
;  Ctrl+F12 — Cheatsheet (działa zawsze)
; ============================================================
^F12::
    if (TooltipOn) {
        ToolTip
        TooltipOn := false
    } else {
        ToolTip, % ""
            . "=============================`n"
            . "  ER:LC RADIO  —  " . Callsign . "`n"
            . "=============================`n"
            . "  NP1   En Route Code 3`n"
            . "  NP2   10-23 On Scene`n"
            . "  NP3   10-8 Available`n"
            . "  NP4   10-45A  Patient Good`n"
            . "  NP5   10-45B  Patient Serious`n"
            . "  NP6   10-45C  Patient Critical`n"
            . "  NP7   10-45D  Patient Deceased`n"
            . "  NP8   Transporting to RCGH`n"
            . "  NP9   10-24 Leaving Scene`n"
            . "  NP0   PANIC / Backup`n"
            . "  NP.   Otwórz radio + prefix`n"
            . "  NPEnter  OOC (nawiasy)`n"
            . "=============================`n"
            . "  Ctrl+F12  Zamknij ten panel"
        , 0, 0
        TooltipOn := true
    }
return
