/**
 * Audio Player Worklet
 */

export async function startAudioPlayerWorklet() {
    // Create an AudioContext
    const audioContext = new AudioContext({
        sampleRate: 24000
    });
    
    
    // Load your custom processor code
    const workletURL = new URL('./pcm-player-processor.js', import.meta.url);
    await audioContext.audioWorklet.addModule(workletURL);
    
    // Create an AudioWorkletNode
    const audioPlayerNode = new AudioWorkletNode(audioContext, 'pcm-player-processor');

    // Connect to the destination
    audioPlayerNode.connect(audioContext.destination);

    // The audioPlayerNode.port is how we send messages (audio data) to the processor
    return [audioPlayerNode, audioContext];
}
