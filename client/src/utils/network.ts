export function getShareableUrl(path: string): string {
    // In development, try to use the local IP address
    if (import.meta.env.DEV) {
        // Get the current hostname - if it's already an IP, use it
        const currentHost = window.location.hostname;
        
        // Check if we're already using an IP address (not localhost)
        if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
            return `${window.location.protocol}//${currentHost}:${window.location.port}${path}`;
        }
        
        // If we're on localhost, try to detect local IP
        // Note: This requires the user to access the site via their IP at least once
        // or we can show instructions to use their IP
        return `${window.location.protocol}//${currentHost}:${window.location.port}${path}`;
    }
    
    // In production, use the actual domain
    return `${window.location.origin}${path}`;
}

export function getLocalNetworkInfo(): { ip: string | null; instructions: string } {
    // We can't directly get the server's IP from the browser due to security restrictions
    // But we can provide instructions
    
    const platform = navigator.platform.toLowerCase();
    let instructions = '';
    
    if (platform.includes('win')) {
        instructions = 'Run "ipconfig" in Command Prompt and look for IPv4 Address';
    } else if (platform.includes('mac')) {
        instructions = 'Run "ifconfig | grep inet" in Terminal';
    } else {
        instructions = 'Run "ip addr" or "ifconfig" in Terminal';
    }
    
    return {
        ip: null,
        instructions: `To share with others on your network: ${instructions}`
    };
}