//sweepline voronoi diagram.
//import { Point } from "./point";

const canvas = <HTMLCanvasElement> document.querySelector('#Canvas');
const button = <HTMLButtonElement>document.querySelector('#button');

//Width and Height of Canvas
const width = canvas.width;
const height = canvas.height;

//Event Listeners for interaction
canvas.addEventListener("click", (e:MouseEvent) => newPoint(e.clientX , e.clientY));
button.addEventListener("click", (e:MouseEvent) => animationID = setInterval(sweepLine, 10));

//Animation variables
let clicked = false;
let animationID: number;
let line_position = 0;

//Fortune algorithm variables
var siteEvents = [];
var circleEvents = [];
var beachLine = null;

var edges = [];
var halfedges = [];
var regions = [];



const ctx = canvas.getContext('2d');

ctx.fillStyle = 'rgb(153, 153, 153)';
ctx.strokeRect(0, 0, width, height);

var pointList = [];

//DEBUG FUNCTION
function printList()
{
    console.log(pointList);
}

//ADDING A NEW POINT
function newPoint(x, y)
{
    if(clicked)
    {
        return;
    }
    x = x - canvas.offsetLeft;
    y = y - canvas.offsetTop;
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, 360, false);
    ctx.fill();
    pointList.push(new Point(x,y));
}

function handleSite(site: Point)
{
    regions.push(new Region(site));

    addToBeachline(site);
}

function addToBeachline(site: Point)
{
    if(beachLine == null)
    {
        beachLine = new TreeNode(site);    
    }
    else
    {
        findSpotInTree(site, beachLine);
    }
}

// adapted from https://github.com/gorhill/Javascript-Voronoi
function leftBreakPoint(node, directrix) 
{
    
    var site = node.site,
        rfocx = site.x,
        rfocy = site.y,
        pbx2 = rfocx-directrix;
    // parabola in degenerate case where focus is on directrix
    if (!pbx2)
    {
        return rfocy;
    }
    var lArc = node.previous;
    if (!lArc) 
    {
        return -Infinity;
    }
    site = lArc.site;
    var lfocx = site.x,
        lfocy = site.y,
        plbx2 = lfocx-directrix;
    // parabola in degenerate case where focus is on directrix
    if (!plbx2) 
    {
        return lfocx;
    }
    var hl = lfocy-rfocy,
        abx2 = 1/pbx2-1/plbx2,
        b = hl/plbx2;
    if (abx2) 
    {
        return (-b+Math.sqrt(b*b-2*abx2*(hl*hl/(-2*plbx2)-lfocy+plbx2/2+rfocy-pbx2/2)))/abx2+rfocx;
    }
    // both parabolas have same distance to directrix, thus break point is midway
    return (rfocx+lfocx)/2;
};

// adapted from https://github.com/gorhill/Javascript-Voronoi
function rightBreakPoint(node, directrix) 
{
    var rArc = node.next;
    if (rArc) {
        return this.leftBreakPoint(rArc, directrix);
        }
    var site = node.site;
    return site.x === directrix ? site.y : Infinity;
};

//TREE LOGIC

//ADAPTED FROM https://github.com/gorhill/Javascript-Voronoi
function insertSuccessor(lArc: TreeNode, newArc: TreeNode)
{
    var parent;
    if (lArc) {
        // >>> rhill 2011-05-27: Performance: cache previous/next nodes
        newArc.previous = lArc;
        newArc.next = lArc.next;
        if (lArc.next) 
        {
            lArc.next.previous = newArc;
        }
        lArc.next = newArc;
        // <<<
        if (lArc.right) 
        {
            // in-place expansion of lArc.right.getFirst();
            lArc = lArc.right;
            while (lArc.left) 
            {
                lArc = lArc.left;
            }
            lArc.left = newArc;
        }
        else 
        {
            lArc.right = newArc;
        }
        parent = lArc;
    }
    // rhill 2011-06-07: if lArc is null, newArc must be inserted
    // to the left-most part of the tree
    else if (beachLine) 
    {
        lArc = getFirst(beachLine);
        // >>> Performance: cache previous/next nodes
        newArc.previous = null;
        newArc.next = lArc;
        lArc.previous = newArc;
        // <<<
        lArc.left = newArc;
        parent = lArc;
    }
    else 
    {
        // >>> Performance: cache previous/next nodes
        newArc.previous = newArc.next = null;
        // <<<
        beachLine = newArc;
        parent = null;
    }
    newArc.left = newArc.right = null;
    newArc.parent = parent;
    newArc.indicator = true;
    // Fixup the modified tree by recoloring nodes and performing
    // rotations (2 at most) hence the red-black tree properties are
    // preserved.
    var grandpa, uncle;
    lArc = newArc;
    while (parent && parent.indicator) {
        grandpa = parent.parent;
        if (parent === grandpa.left) {
            uncle = grandpa.right;
            if (uncle && uncle.indicator) {
                parent.indicator = uncle.indicator = false;
                grandpa.indicator = true;
                lArc = grandpa;
                }
            else {
                if (lArc === parent.right) {
                    rotateLeft(parent);
                    lArc = parent;
                    parent = lArc.parent;
                    }
                parent.indicator = false;
                grandpa.indicator = true;
                rotateRight(grandpa);
                }
            }
        else {
            uncle = grandpa.left;
            if (uncle && uncle.indicator) {
                parent.indicator = uncle.indicator = false;
                grandpa.indicator = true;
                lArc = grandpa;
                }
            else {
                if (lArc === parent.left) {
                    rotateRight(parent);
                    lArc = parent;
                    parent = lArc.parent;
                    }
                parent.indicator = false;
                grandpa.indicator = true;
                rotateLeft(grandpa);
                }
            }
        parent = lArc.parent;
        }
    beachLine.indicator = false;
}

function rotateLeft(node: TreeNode) 
{
    var p = node;
    var q = node.right; // can't be null
    var parent = p.parent;
    
    if (parent) 
    {
        if (parent.left === p) 
        {
            parent.left = q;
        }
        else 
        {
            parent.right = q;
        }
    }
    else 
    {
        this.root = q;
    }
    q.parent = parent;
    p.parent = q;
    p.right = q.left;
    if (p.right) 
    {
        p.right.parent = p;
    }
    q.left = p;
}

function rotateRight(node: TreeNode) 
{
    var p = node;
    var q = node.left; // can't be null
    var parent = p.parent;
    if (parent) 
    {
        if (parent.left === p) 
        {
            parent.left = q;
        }
        else 
        {
            parent.right = q;
        }
    }
    else 
    {
        this.root = q;
    }
    q.parent = parent;
    p.parent = q;
    p.left = q.right;
    if (p.left) 
    {
        p.left.parent = p;
    }
    q.right = p;
}

function getFirst(node: TreeNode) 
{
    while (node.left) 
    {
        node = node.left;
    }
    return node;
}

function getLast(node: TreeNode) 
{
    while (node.right) 
    {
        node = node.right;
    }
    return node;
}


// adapted from https://github.com/gorhill/Javascript-Voronoi
function findSpotInTree(site: Point, root: TreeNode)
{
    let directrix = site.X;
    let site_y = site.Y;

    var currentNode = root;
    var lArc, rArc, lbp, rbp;

    //finding left and right sections of new arc.
    while(currentNode)
    {
        lbp = leftBreakPoint(currentNode, directrix);

        if(lbp - site_y > 1e-9)
        {
            currentNode = currentNode.left;
        }
        else
        {
            rbp = rightBreakPoint(currentNode, directrix);

            if(rbp - site_y > 1e-9)
            {
                if(!currentNode.right)
                {
                    lArc = currentNode;
                    break;
                }
                else
                {
                    currentNode = currentNode.right;
                }
            }
            else
            {
                if(lbp - site_y > -1e-9)
                {
                    lArc = currentNode.previous;
                    rArc = currentNode;
                }
                else if(rbp - site_y > 1e-9)
                {
                    lArc = currentNode;
                    rArc = currentNode.next;
                }
                else
                {
                    lArc = rArc = currentNode;
                }
                break;
            }
        }
    }

    //With the left arc found now, insert the new arc into the tree.
    var newNode = new TreeNode(site);
    insertSuccessor(lArc, newNode);

    //first section
    if (!lArc && !rArc) 
    {
        return;
    }

    //splitting a previous arc
    if (lArc === rArc) 
    {
        // invalidate circle event of split beach section
        detachCircleEvent(lArc);

        // split the beach section into two separate beach sections
        rArc = new TreeNode(lArc.site);
        insertSuccessor(newNode, rArc);

        // since we have a new transition between two beach sections,
        // a new edge is born
        newNode.edge = rArc.edge = createEdge(lArc.site, newNode.site);

        // check whether the left and right beach sections are collapsing
        // and if so create circle events, to be notified when the point of
        // collapse is reached.
        attachCircleEvent(lArc);
        attachCircleEvent(rArc);
        return;
    }

    if (lArc && !rArc) 
    {
        newNode.edge = createEdge(lArc.site,newNode.site);
        return;
    }

    if (lArc !== rArc) 
    {
        // invalidate circle events of left and right sites
        detachCircleEvent(lArc);
        detachCircleEvent(rArc);

        // http://mathforum.org/library/drmath/view/55002.html
        var lSite = lArc.site,
            ax = lSite.x,
            ay = lSite.y,
            bx=site.X-ax,
            by=site.X-ay,
            rSite = rArc.site,
            cx=rSite.x-ax,
            cy=rSite.y-ay,
            d=2*(bx*cy-by*cx),
            hb=bx*bx+by*by,
            hc=cx*cx+cy*cy,
            vertex = new Point((cy*hb-by*hc)/d+ax, (bx*hc-cx*hb)/d+ay);

        // one transition disappear
        if(rArc.edge)
        {
            if(rArc.edge.lSite == rSite)
            {
                rArc.edge.end = vertex;
            }
            else
            {
                rArc.edge.start = vertex;
            }
        }
        else
        {
            rArc.edge = createEdge(lSite, rSite)
            rArc.edge.start = vertex;
        }


        // two new transitions appear at the new vertex location
        newNode.edge = createEdge(lSite, site);
        newNode.edge.end = vertex;
        rArc.edge = createEdge(site, rSite);
        rArc.edge.end = vertex;

        // check whether the left and right beach sections are collapsing
        // and if so create circle events, to handle the point of collapse.
        attachCircleEvent(lArc);
        attachCircleEvent(rArc);
        return;
    }
}

function detachCircleEvent(node: TreeNode)
{
    var cEvent = node.circleEventObject;
    if(cEvent)
    {
        const index = circleEvents.indexOf(cEvent, 0);
        if (index > -1) 
        {
            circleEvents.splice(index, 1);
        }
    }
}

function attachCircleEvent(node: TreeNode)
{
    var lArc = node.previous;
    var rArc = node.next;
    if(!lArc || !rArc)
    {
        console.error("We're missing an arc");
        return;
    }
    var lSite = lArc.site;
    var cSite = node.site;
    var rSite = rArc.site;

    if (lSite===rSite) 
    {
        console.log("Left arc is Right arc.")
        return;
    }

    var bx = cSite.X;
    var by = cSite.X;
    var ax = lSite.X-bx;
    var ay = lSite.X-by;
    var cx = rSite.X-bx;
    var cy = rSite.X-by;

    // http://en.wikipedia.org/wiki/Curve_orientation#Orientation_of_a_simple_polygon
    // rhill 2011-05-21: Nasty finite precision error which caused circumcircle() to
    // return infinites: 1e-12 seems to fix the problem.

    var d = 2*(ax*cy-ay*cx);
    if (d >= -2e-12)
    {
        console.log("d is off.")
        return;
    }

    var ha = ax*ax+ay*ay;
    var hc = cx*cx+cy*cy;
    var x = (cy*ha-ay*hc)/d;
    var y = (ax*hc-cx*ha)/d;
    var ycenter = y+by;

    var newCircleEvent = new CircleEvent(node,
                                      cSite,
                                      x+bx,
                                      ycenter+this.sqrt(x*x+y*y),
                                      ycenter);
    node.circleEventObject = newCircleEvent;

    //add event to queue
    if(circleEvents.length == 0)
    {
        circleEvents.push(newCircleEvent);
    }
    else
    {
        let length = circleEvents.length;
        for(var i = 0; i < length; i++)
        {
            if(circleEvents[i].location.X >= newCircleEvent.location.X)
            {
                circleEvents.splice(i, 0, newCircleEvent);
            }
        }
        if(circleEvents.length == length)
        {
            circleEvents.push(newCircleEvent);
        }
    }
    
}

function removeFromBeachline(event: CircleEvent)
{
    var x = event.location.X
    var y = event.location.Y
    var previous = circleEvents[circleEvents.indexOf(event) - 1] 
    var next = circleEvents[circleEvents.indexOf(event) + 1]
    var disappearingTransitions = [event.node];
    var vertex = new Point(x, event.yCenter)

    detachBeachsection(event);

    //left check
    var lArc = previous.node
    while(previous && Math.abs(x - previous.location.X) < 1e-9 && Math.abs(y - previous.yCenter) < 1e-9)
    {
        previous = circleEvents[circleEvents.indexOf(previous) - 1]
        disappearingTransitions.unshift(lArc)
        detachBeachsection(lArc)
        lArc = previous.node
    }

    if(lArc)
    {
        disappearingTransitions.unshift(lArc);
        detachCircleEvent(lArc);
    }
    

    //right check
    var rArc = next.node
    while(next && Math.abs(x - next.location.X) < 1e-9 && Math.abs(y - next.yCenter) < 1e-9)
    {
        next = circleEvents[circleEvents.indexOf(next) + 1]
        disappearingTransitions.push(rArc)
        detachBeachsection(rArc)
        rArc = next.node
    }

    if(rArc)
    {
        disappearingTransitions.push(rArc)
        detachCircleEvent(rArc)
    }

    //go through disappearingTrans
    var nArcs = disappearingTransitions.length
    for (let iArc = 1; iArc < nArcs; iArc++) 
    {
        rArc = disappearingTransitions[iArc];
        lArc = disappearingTransitions[iArc-1];

        if(rArc.edge)
        {
            if(rArc.edge.lSite == rArc.site)
            {
                rArc.edge.end = vertex;
            }
            else
            {
                rArc.edge.start = vertex;
            }
        }
        else
        {
            rArc.edge = createEdge(lArc.site, rArc.site)
            rArc.edge.start = vertex;
        }
    }

    lArc = disappearingTransitions[0]
    rArc = disappearingTransitions[nArcs-1]
    rArc.edge = createEdge(lArc.site, rArc.site)
    rArc.edge.end = vertex

    attachCircleEvent(lArc)
    attachCircleEvent(rArc)
}

function detachBeachsection(event: CircleEvent)
{
    //baibai event
    detachCircleEvent(event.node)

    //delete from structure
    let index = circleEvents.indexOf(event);
    if (index > -1) 
    {
        circleEvents.splice(index, 1);
    }
}



//MAIN ENTRY POINT FOR ALGORITHM
function sweepLine()
{
    //CHECKS
    if(!clicked)
    {
        button.disabled = true;
        clicked = true;

        //ALGORITHM INIT
        siteEvents = pointList.slice(0);
        siteEvents.sort(function(a,b){
            var diff = b.X - a.X;
            if (diff) {return diff;}
            return b.Y - a.Y;
        });
        //console.log(siteEvents)
    }
    //Don't start before we have points.
    if(pointList.length == 0)
    {
        clearInterval(animationID);
        clicked = false;
        button.disabled = false;
        return;
    }

    //ALGORITHM
    if(siteEvents.length != 0 
        && line_position == siteEvents[siteEvents.length -1].X)
    {
        let site_to_handle = siteEvents.pop();
        handleSite(site_to_handle);

        //Check if theres another at this position.
        if(siteEvents.length != 0 
            && line_position == siteEvents[siteEvents.length -1].X)
        {
            sweepLine();
        }
    }
    
    if(circleEvents.length != 0 
            && line_position == circleEvents[circleEvents.length -1].X)
    {
        let cE = circleEvents.pop();
        removeFromBeachline(cE);

        //Check if theres another at this position.
        if(circleEvents.length != 0 
            && line_position == circleEvents[circleEvents.length -1].X)
        {
            sweepLine();
        }
    }
    
    //CLEAR AND REDRAW
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgb(153, 153, 153)';
    ctx.strokeRect(0, 0, width, height);
    drawPoints();
    ctx.strokeStyle = 'rgb(0, 0, 0)';
    ctx.moveTo(line_position, 0);
    ctx.lineTo(line_position, canvas.height);
    ctx.stroke();
    drawParabolas(beachLine, line_position);
    line_position += 1;

    //END CONDITION
    if(line_position == width
        && siteEvents.length == 0
        && circleEvents.length == 0)
    {
        clearInterval(animationID);
    }
}

//RENDERING


//Mainly from:
//https://jtauber.com/blog/2008/11/29/voronoi_canvas_tutorial_part_iii/
function drawParabola(f: Point, d_X: number)
{
    let alpha = Math.sqrt((d_X*d_X)-(f.X*f.X));
    let p0y = f.Y - alpha;
    let p0x = 0;
    let cp_y = f.Y;
    let cp_x = f.X + d_X;
    let p1y = f.Y + alpha;
    let p1x = 0;

    ctx.strokeStyle = "rgb(100, 100, 100)";
    //ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.beginPath();
    ctx.moveTo(p0x, p0y);
    ctx.quadraticCurveTo(cp_x, cp_y, p1x, p1y);
    ctx.stroke();
    //ctx.fill();
}

function drawParabolas(node: TreeNode, lineX: number)
{
    if(node == null)
    {
        return;
    }

    let currentParabola = getFirst(node);
    drawParabola(currentParabola.site, lineX);
    if(currentParabola.next != null)
    {
        drawParabola(currentParabola.next.site, lineX);
    }
}

function drawPoints()
{
    pointList.forEach(point => {
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.beginPath();
        ctx.arc(point.X, point.Y, 3.5, 0, 360, false);
        ctx.fill();
    });
}


//DATASTRUCTURE HANDLERS
function createEdge(lsite: Point, rsite: Point)
{
    var edge = new Edge(lsite, rsite, null, null);

    regions[regions.indexOf(lsite)].edges.push(edge);
    regions[regions.indexOf(rsite)].edges.push(edge);

    return edge;
}

function createHalfEdge(edge: Edge, lsite: Point, rsite: Point)
{

}

//DATASTRUCTURES
class Point
{
    public X: number;
    public Y: number;

    constructor(x: number, y: number) {
        this.X = x;
        this.Y = y;
    }
}

class Edge
{
    public left_site: Point;
    public right_site: Point;

    public start: Point;
    public end: Point;

    constructor(ls: Point, rs: Point, s: Point, e: Point) {
        this.left_site = ls;
        this.right_site = rs;
        this.start = s;
        this.end = e;
    }
}

class Region
{
    public site: Point;
    public edges: [Edge];

    constructor(s: Point) {
        this.site = s;
    }
}

class CircleEvent
{
    public node: TreeNode;
    public centerSite: Point;
    public location: Point;
    public yCenter: number;

    constructor(arc: TreeNode, site: Point, x: number, y: number, yC: number)
    {
        this.node = arc;
        this.centerSite = site;
        this.location = new Point(x, y);
        this.yCenter = yC;
    }
}

//Used to build Red/Black Tree
class TreeNode
{
    public site: Point;
    public left: TreeNode;
    public right: TreeNode;
    public previous: TreeNode;
    public next: TreeNode;
    public parent: TreeNode;
    public indicator: boolean;
    public edge: Edge;
    public circleEventObject: CircleEvent;

    constructor(s: Point)
    {
        this.site = s;
    }
}