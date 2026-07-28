let echoSocketId: string | undefined;

export function getEchoSocketId(): string | undefined {
  return echoSocketId;
}

export function setEchoSocketId(socketId: string) {
  echoSocketId = socketId;
}
