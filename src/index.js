import { requestStreamDecks } from '@elgato-stream-deck/webhid';

import {
    loadIcon,
    IconMic,
    IconMicSlash,
    IconHangup,
    IconCamera,
    IconCameraSlash,
    IconChat,
    IconHand,
    IconTileView,
} from './icons.js';


// App global state.
//

const state = {
    streamDeck: undefined,
    api: undefined,
    appId: '',
    room: '',
    jwt: '',
    audioMuted: false,
    videoMuted: false,
    chatOpen: false,
    raisedHand: false,
    tileView: false,
};

const deckButtons = [
    // 0: audio mute
    {
        pressHandler: handleAudioMute,
        syncState: syncAudioMuteState,
        loadIcons: loadAudioIcons
    },
    // 1: video mute
    {
        pressHandler: handleVideoMute,
        syncState: syncVideoMuteState,
        loadIcons: loadVideoIcons
    },
    // 2: chat pane
    {
        pressHandler: handleChat,
        syncState: syncChatState,
        loadIcons: loadChatIcons
    },
    // 3: raise hand
    {
        pressHandler: handleRaiseHand,
        syncState: syncRaiseHandState,
        loadIcons: loadRaiseHandIcons
    },
    // 4: tile view
    {
        pressHandler: handleTileView,
        syncState: syncTileViewState,
        loadIcons: loadTileViewIcons
    },
    // 5: hangup
    {
        pressHandler: handleHangup,
        syncState: syncHangupState,
        loadIcons: loadHangupIcon
    }
];


// Form elements.
//

const appIdEl = document.getElementById('appIdText');
const roomEl = document.getElementById('roomText');
const jwtEl = document.getElementById('jwtText');
const joinBtn = document.getElementById('joinBtn');
const connectStreamDeckBtn = document.getElementById('connectStreamDeckBtn');

function updateJoinForm() {
    // In a meeting.
    if (state.api) {
        appIdEl.disabled = true;
        roomEl.disabled = true;
        jwtEl.disabled = true;
        joinBtn.disabled = true;
    } else {
        appIdEl.disabled = false;
        roomEl.disabled = false;
        jwtEl.disabled = false;
        joinBtn.disabled = state.appId.length === 0 || state.room.length === 0 || state.jwt === 0;
    }

    connectStreamDeckBtn.disabled = Boolean(state.streamDeck);
}

updateJoinForm();

appIdEl.onchange = () => {
    state.appId = appIdEl.value.trim();
    updateJoinForm();
}

roomEl.onchange = () => {
    state.room = roomEl.value.trim();
    updateJoinForm();
}

jwtEl.onchange = () => {
    state.jwt = jwtEl.value.trim();
    updateJoinForm();
}

joinBtn.onclick = () => {
    const api = new window.JitsiMeetExternalAPI('8x8.vc', {
        roomName: `${state.appId}/${state.room}`,
        jwt: state.jwt,
    });

    state.api = api;
    updateJoinForm();

    api.on('ready', () => {
        updateStreamDeck();
    });

    api.on('videoConferenceJoined', () => {
        console.log('JOINED');
        updateStreamDeck();
    });

    api.on('readyToClose', () => {
        console.log('READY TO CLOSE');
        api.dispose();
        state.api = undefined;
        state.audioMuted = false;
        state.videoMuted = false;
        state.chatOpen = false;
        state.raisedHand = false;
        state.tileView = false;
        updateJoinForm();
        if (state.streamDeck) {
            state.streamDeck.clearPanel();
        }
    });

    api.on('audioMuteStatusChanged', ({ muted }) => {
        console.log('AUDIO MUTED: %s', muted);
        state.audioMuted = muted;
        updateStreamDeck();
    });

    api.on('videoMuteStatusChanged', ({ muted }) => {
        console.log('VIDEO MUTED: %s', muted);
        state.videoMuted = muted;
        updateStreamDeck();
    });

    api.on('chatUpdated', ({ isOpen }) => {
        console.log('CHAT OPEN: %s', isOpen);
        state.chatOpen = isOpen;
        updateStreamDeck();
    });

    api.on('raiseHandUpdated', ({ handRaised }) => {
        console.log('HAND RAISED: %s', handRaised);
        state.raisedHand = handRaised;
        updateStreamDeck();
    });

    api.on('tileViewChanged', ({ enabled }) => {
        console.log('TILE VIEW: %s', enabled);
        state.tileView = enabled;
        updateStreamDeck();
    });
};

connectStreamDeckBtn.onclick = async () => {
    let decks;

    try {
        decks = await requestStreamDecks();
    } catch (e) {
        console.error(e);

        return;
    }

    const [ deck, ..._ ] = decks;
    if (!deck) { 
        return;
    }

    state.streamDeck = deck;
    updateJoinForm();

    console.log('Serial:', await deck.getSerialNumber())
    console.log('Firmware:', await deck.getFirmwareVersion())

    await deck.clearPanel();

    deckButtons.forEach(x => x.loadIcons(deck.ICON_SIZE, deckButtons.indexOf(x), x));

    deck.on('up', (keyIndex) => {
        console.log('key %d up', keyIndex);
        if (state.api) {
            deckButtons[keyIndex].pressHandler();
        }
    });
    
    deck.on('error', (error) => {
        console.error('Stream Deck error: ', error);
    });
};


// Stream Deck controls.
//

function updateStreamDeck() {
    if (state.api) {
        deckButtons.forEach(x => x.syncState(deckButtons.indexOf(x), x));
    }
}

// Audio mute

function handleAudioMute() {
    state.api.executeCommand('toggleAudio');
}

function syncAudioMuteState(keyIdx, btnState) {
    console.log('Current audio muted state: %s', state.audioMuted);
    state.streamDeck.fillKeyCanvas(keyIdx, state.audioMuted ? btnState.canvas2 : btnState.canvas1);
}

async function loadAudioIcons(size, keyIdx, btnState) {
    btnState.canvas1 = document.createElement('canvas');
    await loadIcon(IconMic, 'Mute', btnState.canvas1, size);
    btnState.canvas2 = document.createElement('canvas');
    await loadIcon(IconMicSlash, 'Unmute', btnState.canvas2, size);
}

// Video mute

function handleVideoMute() {
    state.api.executeCommand('toggleVideo');
}

function syncVideoMuteState(keyIdx, btnState) {
    console.log('Current video muted state: %s', state.videoMuted);
    state.streamDeck.fillKeyCanvas(keyIdx, state.videoMuted ? btnState.canvas2 : btnState.canvas1);
}

async function loadVideoIcons(size, keyIdx, btnState) {
    btnState.canvas1 = document.createElement('canvas');
    await loadIcon(IconCamera, 'Stop', btnState.canvas1, size);
    btnState.canvas2 = document.createElement('canvas');
    await loadIcon(IconCameraSlash, 'Sstart', btnState.canvas2, size);
}

// Chat

function handleChat() {
    state.api.executeCommand('toggleChat');
}

function syncChatState(keyIdx, btnState) {
    state.streamDeck.fillKeyCanvas(keyIdx, state.chatOpen ? btnState.canvas2 : btnState.canvas1);
}

async function loadChatIcons(size, keyIdx, btnState) {
    btnState.canvas1 = document.createElement('canvas');
    await loadIcon(IconChat, 'Open Chat', btnState.canvas1, size);
    btnState.canvas2 = document.createElement('canvas');
    await loadIcon(IconChat, 'Close Chat', btnState.canvas2, size, 'gray');
}

// Raise hand

function handleRaiseHand() {
    state.api.executeCommand('toggleRaiseHand');
}

function syncRaiseHandState(keyIdx, btnState) {
    state.streamDeck.fillKeyCanvas(keyIdx, state.raisedHand ? btnState.canvas2 : btnState.canvas1);
}

async function loadRaiseHandIcons(size, keyIdx, btnState) {
    btnState.canvas1 = document.createElement('canvas');
    await loadIcon(IconHand, 'Raise Hand', btnState.canvas1, size);
    btnState.canvas2 = document.createElement('canvas');
    await loadIcon(IconHand, 'Lower Hand', btnState.canvas2, size, 'gray');
}

// Tile view

function handleTileView() {
    state.api.executeCommand('toggleTileView');
}

function syncTileViewState(keyIdx, btnState) {
    state.streamDeck.fillKeyCanvas(keyIdx, state.tileView ? btnState.canvas2 : btnState.canvas1);
}

async function loadTileViewIcons(size, keyIdx, btnState) {
    btnState.canvas1 = document.createElement('canvas');
    await loadIcon(IconTileView, 'Tile View', btnState.canvas1, size);
    btnState.canvas2 = document.createElement('canvas');
    await loadIcon(IconTileView, 'Stage View ', btnState.canvas2, size, 'gray');
}

// Hangup

function handleHangup() {
    state.api.executeCommand('hangup');
}

function syncHangupState(keyIdx, btnState) {
    state.streamDeck.fillKeyCanvas(keyIdx, btnState.canvas);
}

async function loadHangupIcon(size, keyIdx, btnState) {
    btnState.canvas = document.createElement('canvas');
    await loadIcon(IconHangup, 'Hangup', btnState.canvas, size, 'red');
}
