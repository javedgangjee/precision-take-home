# Server Side Rendering

## Considerations

- Pure server side rendering may be inefficient. At N=100 and assume each page is 0.5MB, then at 30 fps, that would be 15 MB/s for every client.
- MJPEG is a viable option, but image quality may need to be higher at higher N and colour would need to be crisp.

## Proposed Approach

- A hybrid approach for high sample rates, where the server does the generation, computation, initial html and the client side just paints the colours.

- Client will need to send N using a query param in the URL.

- The server calculates the colour array and just sends that in the packet with 0 meaning the cell has no hits, 255 being the max.

- The server loads the HTML and only updates when something fundamental needs to change such as N. After that, use a packet such as:

```
event: colours
id: 1234
data:{"max_count":10000, "colours":[0,12,255,87]}
```

- The client then just has to look up the number in the palette.
Each update frame at N=100 would be a little over say 40KB equalling 1.2 MB/s

### Downside
N may need to be shared or store counts for each client.
