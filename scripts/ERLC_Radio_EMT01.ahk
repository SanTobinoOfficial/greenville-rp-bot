; ============================================================
;  ER:LC Custom Radio GUI -- EMT-01
;  AutoHotkey v1  |  Tier 3 Matchmaking
;  Ctrl+F12 -- show / hide panel
; ============================================================

#NoEnv
#SingleInstance Force
SetWorkingDir %A_ScriptDir%
SendMode Input

; --- SETTINGS ---
Callsign   := "EMT-01"
RadioDelay := 180

; --- COLORS ---
BG     := "1a1a2e"
BG2    := "16213e"
ACCENT := "9b1d1d"
GREEN  := "1b4332"
ORANGE := "7c3d00"
RED    := "7b0000"
GRAY   := "2c2c3e"

; ============================================================
;  BUILD GUI
; ============================================================
Gui, Radio:New, +AlwaysOnTop +ToolWindow -Caption +HWNDhMain
Gui, Radio:Color, %BG%
Gui, Radio:Font, s9 Bold cFFFFFF, Consolas

; --- Title bar ---
Gui, Radio:Add, Text, x0 y0 w260 h28 Background%ACCENT% gDragBar,
Gui, Radio:Add, Text, x8 y6 w200 h18 Background%ACCENT% cFFFFFF gDragBar, [EMS]  ER:LC RADIO -- EMT-01
Gui, Radio:Add, Text, x226 y5 w28 h20 Background%ACCENT% cFFFFFF Center gCloseGUI, X

; --- Status badge ---
Gui, Radio:Font, s8 cFFFFFF, Consolas
Gui, Radio:Add, Text, x8 y35 w244 h16 Background%BG2% vStatusLabel Center, * OFFLINE

; --- STATUS section ---
Gui, Radio:Font, s8 Bold cFFFFFF, Consolas
Gui, Radio:Add, Text, x8 y58 w244 h14 Background%BG% c555577, -- STATUS --------------------------------------------------

Gui, Radio:Add, Button, x8   y74 w118 h26 Background%GREEN% gBtn_EnRoute,  NP1  En Route Code 3
Gui, Radio:Add, Button, x134 y74 w118 h26 Background%GREEN% gBtn_OnScene,  NP2  10-23 On Scene
Gui, Radio:Add, Button, x8  y104 w244 h26 Background%GRAY%  gBtn_Available, NP3  10-8  Available

; --- PATIENT section ---
Gui, Radio:Add, Text, x8 y138 w244 h14 Background%BG% c555577, -- PATIENT STATUS ------------------------------------

Gui, Radio:Add, Button, x8   y155 w59 h26 Background%GREEN%  gBtn_45A, NP4  A
Gui, Radio:Add, Button, x71  y155 w59 h26 Background%ORANGE% gBtn_45B, NP5  B
Gui, Radio:Add, Button, x134 y155 w59 h26 Background%RED%    gBtn_45C, NP6  C
Gui, Radio:Add, Button, x197 y155 w55 h26 Background%BG2%    gBtn_45D, NP7  D

Gui, Radio:Font, s7 c888888, Consolas
Gui, Radio:Add, Text, x8   y183 w59  h12 Background%BG% Center, Good
Gui, Radio:Add, Text, x71  y183 w59  h12 Background%BG% Center, Serious
Gui, Radio:Add, Text, x134 y183 w59  h12 Background%BG% Center, Critical
Gui, Radio:Add, Text, x197 y183 w55  h12 Background%BG% Center, Deceased

; --- TRANSPORT section ---
Gui, Radio:Font, s8 Bold cFFFFFF, Consolas
Gui, Radio:Add, Text, x8 y200 w244 h14 Background%BG% c555577, -- TRANSPORT -----------------------------------------

Gui, Radio:Add, Button, x8   y216 w118 h26 Background%ORANGE% gBtn_Transport, NP8  Transport RCGH
Gui, Radio:Add, Button, x134 y216 w118 h26 Background%GRAY%   gBtn_Clear,     NP9  10-24 Clear

; --- PANIC ---
Gui, Radio:Add, Button, x8 y248 w244 h30 Background%RED% gBtn_Panic, !!!  NP0  PANIC / REQUEST BACKUP  !!!

; --- CUSTOM MESSAGE ---
Gui, Radio:Add, Text, x8 y286 w244 h14 Background%BG% c555577, -- CUSTOM MESSAGE -----------------------------------

Gui, Radio:Font, s8 cFFFFFF, Consolas
Gui, Radio:Add, Edit, x8 y302 w196 h24 Background%BG2% cFFFFFF vCustomMsg,
Gui, Radio:Add, Button, x208 y302 w44 h24 Background%GREEN% gBtn_Custom, Send

; --- OOC ---
Gui, Radio:Add, Button, x8 y332 w244 h24 Background%BG2% gBtn_OOC, [OOC]  Type OOC message  (parentheses)

; --- Footer ---
Gui, Radio:Font, s7 c555577, Consolas
Gui, Radio:Add, Text, x8 y362 w244 h14 Background%BG% Center, Ctrl+F12 show/hide  |  NP. = free input

Gui, Radio:Show, x20 y100 w260 h380 NoActivate
return

; ============================================================
;  DRAG
; ============================================================
DragBar:
    PostMessage, 0xA1, 2,,, A
return

; ============================================================
;  CLOSE GUI
; ============================================================
CloseGUI:
RadioGuiClose:
    Gui, Radio:Hide
return

; ============================================================
;  SEND FUNCTION
; ============================================================
SendRadio(msg) {
    global RadioDelay
    WinActivate, ahk_exe RobloxPlayerBeta.exe
    Sleep, 80
    Send {t}
    Sleep, %RadioDelay%
    SendInput, %msg%
    Sleep, 60
    Send {Enter}
}

; ============================================================
;  BUTTON HANDLERS
; ============================================================
Btn_EnRoute:
    SendRadio(Callsign . " -- responding, en route Code 3.")
    GuiControl, Radio:, StatusLabel, * EN ROUTE -- Code 3
return

Btn_OnScene:
    SendRadio(Callsign . " -- 10-23, on scene.")
    GuiControl, Radio:, StatusLabel, * ON SCENE -- 10-23
return

Btn_Available:
    SendRadio(Callsign . " -- 10-8, available.")
    GuiControl, Radio:, StatusLabel, * AVAILABLE -- 10-8
return

Btn_45A:
    SendRadio(Callsign . " -- 10-45 Alpha, patient condition good.")
    GuiControl, Radio:, StatusLabel, * PATIENT -- 10-45A Good
return

Btn_45B:
    SendRadio(Callsign . " -- 10-45 Bravo, patient condition serious.")
    GuiControl, Radio:, StatusLabel, * PATIENT -- 10-45B Serious
return

Btn_45C:
    SendRadio(Callsign . " -- 10-45 Charlie, patient condition critical.")
    GuiControl, Radio:, StatusLabel, * PATIENT -- 10-45C Critical
return

Btn_45D:
    SendRadio(Callsign . " -- 10-45 Delta, patient is deceased.")
    GuiControl, Radio:, StatusLabel, * PATIENT -- 10-45D Deceased
return

Btn_Transport:
    SendRadio(Callsign . " -- leaving scene, transporting to RCGH Code 3.")
    GuiControl, Radio:, StatusLabel, * TRANSPORTING -- RCGH
return

Btn_Clear:
    SendRadio(Callsign . " -- 10-24, clearing scene, 10-8.")
    GuiControl, Radio:, StatusLabel, * CLEAR -- 10-8
return

Btn_Panic:
    SendRadio(Callsign . " -- MAYDAY MAYDAY, requesting immediate backup! 10-99!")
    GuiControl, Radio:, StatusLabel, !!! PANIC -- BACKUP REQUESTED !!!
return

Btn_Custom:
    Gui, Radio:Submit, NoHide
    if (CustomMsg != "") {
        msg := Callsign . " -- " . CustomMsg
        SendRadio(msg)
        GuiControl, Radio:, CustomMsg,
        GuiControl, Radio:, StatusLabel, * SENT -- custom message
    }
return

Btn_OOC:
    WinActivate, ahk_exe RobloxPlayerBeta.exe
    Sleep, 80
    Send {t}
    Sleep, %RadioDelay%
    SendInput, % "("
return

; ============================================================
;  NUMPAD HOTKEYS (Roblox only)
; ============================================================
#IfWinActive ahk_exe RobloxPlayerBeta.exe

Numpad1:: GoSub, Btn_EnRoute
Numpad2:: GoSub, Btn_OnScene
Numpad3:: GoSub, Btn_Available
Numpad4:: GoSub, Btn_45A
Numpad5:: GoSub, Btn_45B
Numpad6:: GoSub, Btn_45C
Numpad7:: GoSub, Btn_45D
Numpad8:: GoSub, Btn_Transport
Numpad9:: GoSub, Btn_Clear
Numpad0:: GoSub, Btn_Panic

NumpadDot::
    Send {t}
    Sleep, %RadioDelay%
    SendInput, % Callsign . " -- "
return

NumpadEnter:: GoSub, Btn_OOC

#IfWinActive

; ============================================================
;  Ctrl+F12 -- Toggle GUI
; ============================================================
^F12::
    if DllCall("IsWindowVisible", "Ptr", hMain) {
        Gui, Radio:Hide
    } else {
        Gui, Radio:Show, NoActivate
    }
return
