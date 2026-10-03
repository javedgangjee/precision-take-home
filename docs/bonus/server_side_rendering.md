# Server Side Rendering

## Considerations

- Pure server side rendering may be inefficient. At N=100 and assume each page is 0.5MB, then at 30 fps, that would be 15 MBps.
- MJPEG is a solid option, but I think you would not be able to interact with the front end.

## Proposed Approach

- I would propose a hybrid approach where the server does the layout and computation and the client side just paints the colours

- The server loads the html and only updates when something fundamental needs to change such as N.

- After that I'd propose using a packet as such as:

```
event: update
id: 1234
data:{"max":10000, "colours":[0,12,255,87]}
```

- The server does generation, binning and counting. It computes the colour and just sends that in the packet with 0 meaning the cell has no hits, 255 being the max.

- The client then just has to look up the number in the palette.
Each update frame at N=100 would be a little over 10KB bytes equalling 300 KBps


- Further optimizations can continue like adding base64 or gzip.- You could also provide coordinates and only send the cubes that changed in each packet.
