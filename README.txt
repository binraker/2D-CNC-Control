This application is intended to act as a CAM processor/post processor for 2D CNC  
jobs.

It was inspired by Silhouette Studio and I would eventually like it to be an 
open source project that has similar features.

It uses a deviation based representation of paths which are packed into JSON 
structures. This structure can be seen in the files test2, testshape and Woohoo. 
Each movement has a speed (feed rate) a power (laser power/engraver speed), a
comment and a point that is the final destination of that movement in [x,y,d] 
format. x and y are the target point and d is is the left hand deviation of the 
arc it should take. So a straight line has d=0, a clockwise arc has d>0 and 
anticlockwise arc d<0. This system is ideally constrained so you cannot get arcs 
that are impossible.

I have python code that converts DXF and G-code to this deviation format.

The idea is that there would be a server running that would serve index.html and 
any static files that are needed and then the user works away in their browser.

CNC files would be uploaded to the server where they are converted into the 
deviation format and then added to the library of avalible designs. Similarly 
with materials, they are specified in the browser, that data is sent to the 
server that then adds them to the library.

The user then selects the materials and paths to be cut and send this to the 
server who then converts it back to whatever code the machine wants and 
dispatches it to the machine.
