/**
 * HLS engine
 */
'use strict';

import Event from './events';
import FragmentLoader from './loader/fragment-loader';
import observer from './observer';
import PlaylistLoader from './loader/playlist-loader';
import Stream from './utils/stream';
import TSDemuxer from './demux/tsdemuxer';
import { logger, enableLogs } from './utils/logger';
//import MP4Inspect         from '/remux/mp4-inspector';

var init, attachView, attachSource;
var stream;
var mediaSource;
var playlistLoader, fragmentLoader;
var buffer, demuxer;
var mp4segments;
var fragments;
var fragmentIndex;

init = function() {
    mediaSource = new MediaSource();
    stream = new Stream();
    playlistLoader = new PlaylistLoader();
    fragmentLoader = new FragmentLoader();
    demuxer = new TSDemuxer();
    mp4segments = [];
    // setup the media source
    mediaSource.addEventListener('sourceopen', onMediaSourceOpen);
    mediaSource.addEventListener('sourceended', function() {
        logger.log('media source ended');
    });

    mediaSource.addEventListener('sourceclose', function() {
        logger.log('media source closed');
    });

    hls.on(Event.MANIFEST_LOADED, function(event, data) {
        fragments = data.levels[0].fragments;
        fragmentIndex = 0;
        fragmentLoader.load(fragments[fragmentIndex++].url);
        var stats, rtt, loadtime;
        stats = data.stats;
        rtt = stats.tfirst - stats.trequest;
        loadtime = stats.tend - stats.trequest;
        logger.log(
            'playlist loaded,RTT(ms)/load(ms)/nb frag:' +
                rtt +
                '/' +
                loadtime +
                '/' +
                stats.length
        );
    });

    hls.on(Event.FRAGMENT_LOADED, function(event, data) {
        demuxer.push(new Uint8Array(data.payload));
        demuxer.end();
        appendSegments();
        if (fragmentIndex < fragments.length) {
            fragmentLoader.load(fragments[fragmentIndex++].url);
        } else {
            logger.log('last fragment loaded');
            observer.trigger(Event.LAST_FRAGMENT_LOADED);
        }
        var stats, rtt, loadtime, bw;
        stats = data.stats;
        rtt = stats.tfirst - stats.trequest;
        loadtime = stats.tend - stats.trequest;
        bw = stats.length * 8 / (1000 * loadtime);
        logger.log(
            'frag loaded, RTT(ms)/load(ms)/bitrate:' +
                rtt +
                '/' +
                loadtime +
                '/' +
                bw.toFixed(3) +
                ' Mb/s'
        );
    });

    // transmux the MPEG-TS data to ISO-BMFF segments
    hls.on(Event.FRAGMENT_PARSED, function(event, segment) {
        //logger.log(JSON.stringify(MP4Inspect.mp4toJSON(segment.data)),null,4);
        mp4segments.push(segment);
    });
};

attachView = function(video) {
    video.src = URL.createObjectURL(mediaSource);
    video.addEventListener('loadstart', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('progress', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('suspend', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('abort', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('error', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('emptied', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('stalled', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('loadedmetadata', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('loadeddata', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('canplay', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('canplaythrough', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('playing', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('waiting', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('seeking', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('seeked', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('durationchange', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('timeupdate', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('play', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('pause', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('ratechange', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('resize', function(evt) {
        logEvt(evt);
    });
    video.addEventListener('volumechange', function(evt) {
        logEvt(evt);
    });
};

attachSource = function(url) {
    url = url;
    logger.log('attachSource:' + url);
    playlistLoader.load(url);
};

function onMediaSourceOpen() {
    buffer = mediaSource.addSourceBuffer(
        'video/mp4;codecs=avc1.4d400d,mp4a.40.5'
    );

    buffer.addEventListener('updateend', function() {
        appendSegments();
    });

    buffer.addEventListener('error', function(event) {
        logger.log(' buffer append error:' + event);
    });
    observer.trigger(Event.FRAMEWORK_READY);
}

function appendSegments() {
    if (!buffer.updating && mp4segments.length) {
        buffer.appendBuffer(mp4segments.shift().data);
    }
}

function logEvt(evt) {
    var data = '';
    switch (evt.type) {
        case 'durationchange':
            data = event.target.duration;
            break;
        case 'resize':
            data =
                'videoWidth:' +
                evt.target.videoWidth +
                '/videoHeight:' +
                evt.target.videoHeight;
            break;
        case 'loadedmetadata':
            data =
                'duration:' +
                evt.target.duration +
                '/videoWidth:' +
                evt.target.videoWidth +
                '/videoHeight:' +
                evt.target.videoHeight;
            break;
        case 'loadeddata':
        case 'canplay':
        case 'canplaythrough':
        case 'timeupdate':
        case 'seeking':
        case 'seeked':
        case 'pause':
        case 'play':
        case 'stalled':
            data = 'currentTime:' + evt.target.currentTime;
            break;
        default:
            break;
    }
    logger.log(evt.type + ':' + data);
}

let hls = {
    init: init,
    debug: enableLogs,
    attachView: attachView,
    attachSource: attachSource,
    // Events
    Events: Event,
    on: observer.on.bind(observer),
    off: observer.removeListener.bind(observer)
};

export default hls;
