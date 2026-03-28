// develops.js
feathers.register({
    id: 'develops',
    name: 'Develops',
    version: '1.2.0',
    author: 'Feathers Team',
    description: 'Adds a badge below AI messages showing response latency and estimated token usage.',

    onLoad(api) {
        let sentTime = 0;
        api.events.on('message:sent', () => { sentTime = Date.now(); });
        api.events.on('message:received', (data) => {
            const latencyMs = Date.now() - sentTime;
            const latencySec = (latencyMs / 1000).toFixed(1);
            const words = data.content.trim().split(/\s+/).length;
            const estimatedTokens = Math.round(words * 1.3);

            api.ui.addMessageBadge(data.id, {
                text: latencySec + 's • ~' + estimatedTokens + ' tokens',
                icon: 'fa-solid fa-chart-line',
                style: 'subtle'
            });
        });
    }
});
