import React, { useEffect, useRef, useState } from "react";
import AppBar from "@material-ui/core/AppBar";
import CssBaseline from "@material-ui/core/CssBaseline";
import Divider from "@material-ui/core/Divider";
import Drawer from "@material-ui/core/Drawer";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import MenuIcon from "@material-ui/icons/Menu";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import Grow from "@material-ui/core/Grow";
import Paper from "@material-ui/core/Paper";
import Popper from "@material-ui/core/Popper";
import MenuItem from "@material-ui/core/MenuItem";
import MenuList from "@material-ui/core/MenuList";
import PublishIcon from "@material-ui/icons/Publish";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import {
  close,
  structSquare,
  getLargestComponents,
  open,
  dilate,
  erode,
  structCross,
} from "./utils/morphology";
import {
  buildCC,
  thinPixel,
  thinCC,
  ccToBin,
  generateLookupTable,
} from "./utils/thin";
import { getLength, invert, contrastLimitedAdaptive } from "./utils/tools";
import {
  imgToGreyscale,
  greyscaleToBin,
  greyscaleToBinAdaptive,
  binToImg,
  greyscaleToImg,
} from "./utils/convert";
import ModifiedSlider from "./components/ModifiedSlider";

const drawerWidth = 300;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex",
    },
    drawer: {
      [theme.breakpoints.up("sm")]: {
        width: drawerWidth,
        flexShrink: 0,
      },
    },
    appBar: {
      [theme.breakpoints.up("sm")]: {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: drawerWidth,
      },
    },
    menuButton: {
      marginRight: theme.spacing(2),
      [theme.breakpoints.up("sm")]: {
        display: "none",
      },
    },
    toolbar: theme.mixins.toolbar,
    drawerPaper: {
      width: drawerWidth,
    },
    content: {
      flexGrow: 1,
      padding: theme.spacing(3),
    },
    menu: {
      display: "flex",
      flexDirection: "column",
      padding: theme.spacing(3),
      position: "relative",
      "& > *": {
        marginBottom: theme.spacing(2),
      },
    },
    button: {
      alignSelf: "flex-start",
    },
    imageContainer: {
      position: "relative",
      flexGrow: 1,
    },
    canvas: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      marginRight: "auto",
      marginLeft: "auto",
    },
    mask: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      marginRight: "auto",
      marginLeft: "auto",
    },
    cardContent: {
      overflow: "scroll",
      minHeight: 300,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    progress: {
      minWidth: 500,
    },
    buttons: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      "& > *": {
        marginBottom: theme.spacing(2),
        marginRight: theme.spacing(2),
      },
    },
    menuTitle: {
      marginTop: theme.spacing(3),
    },
    cursor: {
      position: "absolute",
      display: "none",
      background: "rgba(51, 224, 255, .4)",
      pointerEvents: "none",
    },
  })
);

function App() {
  const classes = useStyles();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [file, setFile] = useState<string>();
  const [minThreshold, setMinThreshold] = useState<number>(188);
  const [maxThreshold, setMaxThreshold] = useState<number>(255);
  const [closeIterations, setCloseIterations] = useState<number>(0);
  const [openIterations, setOpenIterations] = useState<number>(0);
  const [dilateIterations, setDilateIterations] = useState<number>(0);
  const [erodeIterations, setErodeIterations] = useState<number>(0);
  const [length, setLength] = useState<number>();
  const [brush, setBrush] = useState<number>(3);
  const [draw, setDraw] = useState(1);
  const [openThinButton, setOpenThinButton] = React.useState(false);
  const [thinIndex, setThinIndex] = React.useState(0);
  const [clip, setClip] = React.useState(4);
  const [blockRadius, setBlockRadius] = useState<number>(8);
  const [contrastBlockRadius, setContrastBlockRadius] = useState<number>(8);
  const [constant, setConstant] = useState<number>(5);

  const MIN_RGB = 0;
  const MAX_RGB = 255;
  const MIN_ITERATIONS = 0;
  const MAX_ITERATIONS = 10;
  const SCALE = 0.5;
  const MAX_BRUSH = 200;
  const MIN_BRUSH = 0;
  const MIN_BLOCK = 0;
  const MAX_BLOCK = 32;
  const MIN_CONSTANT = -30;
  const MAX_CONSTANT = 100;
  const MIN_CLIP = 1;
  const MAX_CLIP = 100;
  const thinOptions = ["Cell Complex Thinning", "Serial Thinning"];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lookupRef = useRef<Record<string, boolean> | null>(null);
  const maskBinRef = useRef<number[][] | null>();
  const greyscaleRef = useRef<number[][] | null>();
  const brushRef = useRef<HTMLDivElement>(null);
  const brushDownRef = useRef(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const thinAnchorRef = React.useRef<HTMLDivElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(URL.createObjectURL(e.target.files?.[0]));
  };

  const handleThinMenuItemClick = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    index: number
  ) => {
    setThinIndex(index);
    setOpenThinButton(false);
  };

  const handleThinToggle = () => {
    setOpenThinButton((prev) => !prev);
  };

  const handleThinClose = (event: React.MouseEvent<Document, MouseEvent>) => {
    if (
      thinAnchorRef.current &&
      thinAnchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }

    setOpenThinButton(false);
  };

  const handleThinButton = () => {
    if (
      maskBinRef.current &&
      lookupRef.current &&
      maskCanvasRef.current &&
      imgRef.current
    ) {
      const maskContext = maskCanvasRef.current.getContext("2d");
      if (maskContext) {
        const width = Math.floor(imgRef.current.width * SCALE);
        const height = Math.floor(imgRef.current.height * SCALE);
        let binRep = getLargestComponents(maskBinRef.current, 1, structSquare);
        switch (thinIndex) {
          case 0:
            binRep = ccToBin(
              thinCC(buildCC(binRep), [4, 0.4]),
              height,
              width,
              lookupRef.current
            );
            break;
          case 1:
            binRep = thinPixel(binRep, lookupRef.current);
            break;
        }
        maskBinRef.current = binRep;
        const length = getLength(binRep, SCALE);
        setLength(length);
        const maskImage = maskContext.createImageData(width, height);
        binToImg(binRep, maskImage.data);
        maskContext.putImageData(maskImage, 0, 0);
      }
    }
  };

  useEffect(() => {
    if (brushRef.current) {
      const size = brush * 2 + 1;
      brushRef.current.style.width = `${size}px`;
      brushRef.current.style.height = `${size}px`;
      brushRef.current.style.marginLeft = `-${brush}px`;
      brushRef.current.style.marginTop = `-${brush}px`;
    }
  }, [brush]);

  const handleDrawToggle = () => {
    setDraw((prev) => (prev === 1 ? 0 : 1));
  };

  const handleMorphologyButton = (type: string) => {
    if (
      maskBinRef.current &&
      lookupRef.current &&
      maskCanvasRef.current &&
      imgRef.current
    ) {
      const maskContext = maskCanvasRef.current.getContext("2d");
      if (maskContext) {
        const width = Math.floor(imgRef.current.width * SCALE);
        const height = Math.floor(imgRef.current.height * SCALE);
        switch (type) {
          case "open":
            maskBinRef.current = open(
              maskBinRef.current,
              structSquare,
              openIterations
            );
            break;
          case "close":
            maskBinRef.current = close(
              maskBinRef.current,
              structSquare,
              closeIterations
            );
            break;
          case "dilate":
            maskBinRef.current = dilate(
              maskBinRef.current,
              structSquare,
              dilateIterations
            );
            break;
          case "erode":
            maskBinRef.current = erode(
              maskBinRef.current,
              structSquare,
              erodeIterations
            );
            break;
        }
        const maskImage = maskContext.createImageData(width, height);
        binToImg(maskBinRef.current, maskImage.data);
        maskContext.putImageData(maskImage, 0, 0);
      }
    }
  };

  const handleContrastButton = () => {
    if (greyscaleRef.current && canvasRef.current && imgRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        const width = Math.floor(imgRef.current.width * SCALE);
        const height = Math.floor(imgRef.current.height * SCALE);
        let contrastRep = contrastLimitedAdaptive(
          greyscaleRef.current,
          contrastBlockRadius,
          clip
        );
        greyscaleRef.current = contrastRep;
        const bkgImage = context.createImageData(width, height);
        greyscaleToImg(contrastRep, bkgImage.data);
        context.putImageData(bkgImage, 0, 0);
      }
    }
  };

  const handleInvertButton = () => {
    if (
      maskBinRef.current &&
      lookupRef.current &&
      maskCanvasRef.current &&
      imgRef.current
    ) {
      const maskContext = maskCanvasRef.current.getContext("2d");
      if (maskContext) {
        const width = Math.floor(imgRef.current.width * SCALE);
        const height = Math.floor(imgRef.current.height * SCALE);
        maskBinRef.current = invert(maskBinRef.current);
        const maskImage = maskContext.createImageData(width, height);
        binToImg(maskBinRef.current, maskImage.data);
        maskContext.putImageData(maskImage, 0, 0);
      }
    }
  };

  const handleSimpleButton = () => {
    thresholdImage(true);
  };

  const handleAdaptiveButton = () => {
    thresholdImage(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (
      brushRef.current &&
      maskCanvasRef.current &&
      imgRef.current &&
      maskBinRef.current
    ) {
      brushRef.current.style.top = `${e.pageY}px`;
      brushRef.current.style.left = `${e.pageX}px`;
      if (brushDownRef.current === true) {
        const width = Math.floor(imgRef.current.width * SCALE);
        const height = Math.floor(imgRef.current.height * SCALE);
        const rect = e.currentTarget.getBoundingClientRect();
        const xRaw = Math.ceil(e.clientX - rect.left) + 1;
        const yRaw = Math.ceil(e.clientY - rect.top) + 2;
        if (xRaw >= 0 && yRaw >= 0 && xRaw < height && yRaw < width) {
          const maskContext = maskCanvasRef.current.getContext("2d");
          if (maskContext) {
            const binRepCopy = maskBinRef.current.map((e) => e.slice());
            for (let i = yRaw - brush; i <= yRaw + brush; i++) {
              for (let j = xRaw - brush; j <= xRaw + brush; j++) {
                if (i >= 0 && j >= 0 && i < height && j < width) {
                  binRepCopy[i][j] = draw;
                }
              }
            }
            maskBinRef.current = binRepCopy;
            const size = brush * 2 + 1;
            const newData = [...Array(size)].map((e) => Array(size).fill(draw));
            const maskImage = maskContext.createImageData(size, size);
            binToImg(newData, maskImage.data);
            maskContext.putImageData(
              maskImage,
              xRaw - brush - 1,
              yRaw - brush - 1
            );
          }
        }
      }
    }
  };
  const handleMouseEnter = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (brushRef.current) {
      brushRef.current.style.display = "block";
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (brushRef.current) {
      brushRef.current.style.display = "none";
      brushDownRef.current = false;
    }
  };
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (
      brushRef.current &&
      maskCanvasRef.current &&
      imgRef.current &&
      maskBinRef.current
    ) {
      brushDownRef.current = true;
      brushRef.current.style.top = `${e.pageY}px`;
      brushRef.current.style.left = `${e.pageX}px`;
      if (brushDownRef.current === true) {
        const width = Math.floor(imgRef.current.width * SCALE);
        const height = Math.floor(imgRef.current.height * SCALE);
        const rect = e.currentTarget.getBoundingClientRect();
        const xRaw = Math.ceil(e.clientX - rect.left) + 1;
        const yRaw = Math.ceil(e.clientY - rect.top) + 2;
        if (xRaw >= 0 && yRaw >= 0 && xRaw < height && yRaw < width) {
          const maskContext = maskCanvasRef.current.getContext("2d");
          if (maskContext) {
            const binRepCopy = maskBinRef.current.map((e) => e.slice());
            for (let i = yRaw - brush; i <= yRaw + brush; i++) {
              for (let j = xRaw - brush; j <= xRaw + brush; j++) {
                if (i >= 0 && j >= 0 && i < height && j < width) {
                  binRepCopy[i][j] = draw;
                }
              }
            }
            maskBinRef.current = binRepCopy;
            const size = brush * 2 + 1;
            const newData = [...Array(size)].map((e) => Array(size).fill(draw));
            const maskImage = maskContext.createImageData(size, size);
            binToImg(newData, maskImage.data);
            maskContext.putImageData(
              maskImage,
              xRaw - brush - 1,
              yRaw - brush - 1
            );
          }
        }
      }
    }
  };
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (maskCanvasRef.current && brushRef.current) {
      brushDownRef.current = false;
    }
  };

  const handleClearButton = () => {
    if (
      maskBinRef.current &&
      lookupRef.current &&
      maskCanvasRef.current &&
      imgRef.current
    ) {
      const maskContext = maskCanvasRef.current.getContext("2d");
      if (maskContext) {
        const width = Math.floor(imgRef.current.width * SCALE);
        const height = Math.floor(imgRef.current.height * SCALE);
        maskBinRef.current = [...Array(height)].map((e) =>
          Array(width).fill(0)
        );
        const maskImage = maskContext.createImageData(width, height);
        binToImg(maskBinRef.current, maskImage.data);
        maskContext.putImageData(maskImage, 0, 0);
      }
    }
  };

  const thresholdImage = (simple: boolean) => {
    if (
      canvasRef.current &&
      maskCanvasRef.current &&
      imgRef.current &&
      greyscaleRef.current
    ) {
      const context = canvasRef.current.getContext("2d");
      const maskContext = maskCanvasRef.current.getContext("2d");
      if (context && maskContext) {
        const width = Math.floor(imgRef.current.width * SCALE);
        const height = Math.floor(imgRef.current.height * SCALE);
        let binRep = simple
          ? greyscaleToBin(greyscaleRef.current, minThreshold, maxThreshold)
          : greyscaleToBinAdaptive(greyscaleRef.current, blockRadius, constant);
        maskBinRef.current = binRep;
        const maskImage = maskContext.createImageData(width, height);
        binToImg(binRep, maskImage.data);
        maskContext.putImageData(maskImage, 0, 0);
      }
    }
  };

  const handleResetButton = () => {
    setupImage();
  };

  const setupImage = () => {
    if (
      canvasRef.current &&
      maskCanvasRef.current &&
      imgRef.current &&
      lookupRef.current &&
      imageContainerRef.current
    ) {
      const context = canvasRef.current.getContext("2d");
      const maskContext = maskCanvasRef.current.getContext("2d");
      if (context && maskContext) {
        const width = Math.floor(imgRef.current.width * SCALE);
        const height = Math.floor(imgRef.current.height * SCALE);
        imageContainerRef.current.style.minHeight = `${height}px`;
        context.clearRect(0, 0, width, height);
        maskContext.clearRect(0, 0, width, height);
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        maskCanvasRef.current.width = width;
        maskCanvasRef.current.height = height;
        context.drawImage(imgRef.current, 0, 0, width, height);
        const image = context.getImageData(0, 0, width, height);
        const imagePixels = image.data;
        greyscaleRef.current = imgToGreyscale(imagePixels, width, height);
      }
    }
  };

  const handleLuckyButton = () => {
    if (
      canvasRef.current &&
      maskCanvasRef.current &&
      imgRef.current &&
      lookupRef.current &&
      imageContainerRef.current
    ) {
      const context = canvasRef.current.getContext("2d");
      const maskContext = maskCanvasRef.current.getContext("2d");
      if (context && maskContext) {
        const width = Math.floor(imgRef.current.width * SCALE);
        const height = Math.floor(imgRef.current.height * SCALE);
        imageContainerRef.current.style.minHeight = `${height}px`;
        context.drawImage(imgRef.current, 0, 0, width, height);
        const image = context.getImageData(0, 0, width, height);
        const imagePixels = image.data;
        greyscaleRef.current = imgToGreyscale(imagePixels, width, height);
        greyscaleRef.current = contrastLimitedAdaptive(
          greyscaleRef.current,
          8,
          3
        );
        const bkgImage = context.createImageData(width, height);
        greyscaleToImg(greyscaleRef.current, bkgImage.data);
        context.putImageData(bkgImage, 0, 0);
        maskBinRef.current = greyscaleToBinAdaptive(
          greyscaleRef.current,
          8,
          30
        );
        maskBinRef.current = close(maskBinRef.current, structSquare, 1);
        maskBinRef.current = getLargestComponents(
          maskBinRef.current,
          1,
          structSquare
        );
        maskBinRef.current = thinPixel(maskBinRef.current, lookupRef.current);
        const length = getLength(maskBinRef.current, SCALE);
        setLength(length);
        const maskImage = maskContext.createImageData(width, height);
        binToImg(maskBinRef.current, maskImage.data);
        maskContext.putImageData(maskImage, 0, 0);
      }
    }
  };

  useEffect(() => {
    imgRef.current = new Image();
    lookupRef.current = generateLookupTable();
    imgRef.current.onload = () => {
      setupImage();
    };
  }, []);

  useEffect(() => {
    if (file && imgRef.current) {
      imgRef.current.src = file;
    }
  }, [file]);

  const drawer = (
    <div>
      <div className={classes.toolbar} />
      <Divider />
      <div className={classes.menu}>
        <Typography variant="h6">Contrast Options</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleResetButton}
          disabled={file ? false : true}
          className={classes.button}
        >
          Reset Image
        </Button>
        <ModifiedSlider
          title="Block Radius"
          id="contrast-block-radius-slider"
          disabled={file ? false : true}
          current={contrastBlockRadius}
          setCurrent={setContrastBlockRadius}
          min={MIN_BLOCK}
          max={MAX_BLOCK}
        />
        <ModifiedSlider
          title="Clip"
          id="clip-slider"
          disabled={file ? false : true}
          current={clip}
          setCurrent={setClip}
          min={MIN_CLIP}
          max={MAX_CLIP}
        />
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleContrastButton}
          disabled={file ? false : true}
          className={classes.button}
        >
          Adaptive Contrast
        </Button>
        <Typography variant="h6">Threshold Options</Typography>
        <ModifiedSlider
          title="Minimum Threshold"
          id="min-threshold-slider"
          disabled={file ? false : true}
          current={minThreshold}
          setCurrent={setMinThreshold}
          min={MIN_RGB}
          max={MAX_RGB}
        />
        <ModifiedSlider
          title="Max Threshold"
          id="max-threshold-slider"
          disabled={file ? false : true}
          current={maxThreshold}
          setCurrent={setMaxThreshold}
          min={MIN_RGB}
          max={MAX_RGB}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSimpleButton}
          disabled={file ? false : true}
          className={classes.button}
        >
          Simple Threshold
        </Button>
        <ModifiedSlider
          title="Block Radius"
          id="block-radius-slider"
          disabled={file ? false : true}
          current={blockRadius}
          setCurrent={setBlockRadius}
          min={MIN_BLOCK}
          max={MAX_BLOCK}
        />
        <ModifiedSlider
          title="Constant"
          id="constant-slider"
          disabled={file ? false : true}
          current={constant}
          setCurrent={setConstant}
          min={MIN_CONSTANT}
          max={MAX_CONSTANT}
        />
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleAdaptiveButton}
          disabled={file ? false : true}
          className={classes.button}
        >
          Adaptive Threshold
        </Button>
        <Typography variant="h6" className={classes.menuTitle}>
          Mask Tools
        </Typography>
        <ModifiedSlider
          title="Brush Radius"
          id="brush-slider"
          disabled={file ? false : true}
          current={brush}
          setCurrent={setBrush}
          min={MIN_BRUSH}
          max={MAX_BRUSH}
        />
        <ButtonGroup
          color="primary"
          aria-label="mask tools"
          disabled={file ? false : true}
        >
          <Button
            variant={draw === 1 ? "contained" : undefined}
            onClick={handleDrawToggle}
          >
            Draw
          </Button>
          <Button
            variant={draw === 0 ? "contained" : undefined}
            onClick={handleDrawToggle}
          >
            Erase
          </Button>
        </ButtonGroup>
        <Button
          variant="outlined"
          onClick={handleInvertButton}
          disabled={file ? false : true}
          className={classes.button}
        >
          Invert Mask
        </Button>
        <Button
          variant="outlined"
          onClick={handleClearButton}
          disabled={file ? false : true}
          className={classes.button}
        >
          Clear mask
        </Button>
        <Typography variant="h6" className={classes.menuTitle}>
          Mask Morphology
        </Typography>
        <ModifiedSlider
          title="Close Iterations"
          id="close-slider"
          disabled={file ? false : true}
          current={closeIterations}
          setCurrent={setCloseIterations}
          min={MIN_ITERATIONS}
          max={MAX_ITERATIONS}
        />
        <Button
          variant="outlined"
          color="primary"
          onClick={() => handleMorphologyButton("close")}
          disabled={file ? false : true}
          className={classes.button}
        >
          Close Mask
        </Button>
        <ModifiedSlider
          title="Open Iterations"
          id="open-slider"
          disabled={file ? false : true}
          current={openIterations}
          setCurrent={setOpenIterations}
          min={MIN_ITERATIONS}
          max={MAX_ITERATIONS}
        />
        <Button
          variant="outlined"
          color="primary"
          onClick={() => handleMorphologyButton("open")}
          disabled={file ? false : true}
          className={classes.button}
        >
          Open Mask
        </Button>
        <ModifiedSlider
          title="Dilate Iterations"
          id="dilate-slider"
          disabled={file ? false : true}
          current={dilateIterations}
          setCurrent={setDilateIterations}
          min={MIN_ITERATIONS}
          max={MAX_ITERATIONS}
        />
        <Button
          variant="outlined"
          color="primary"
          onClick={() => handleMorphologyButton("dilate")}
          disabled={file ? false : true}
          className={classes.button}
        >
          Dilate Mask
        </Button>
        <ModifiedSlider
          title="Erode Iterations"
          id="erode-slider"
          disabled={file ? false : true}
          current={erodeIterations}
          setCurrent={setErodeIterations}
          min={MIN_ITERATIONS}
          max={MAX_ITERATIONS}
        />
        <Button
          variant="outlined"
          color="primary"
          onClick={() => handleMorphologyButton("erode")}
          disabled={file ? false : true}
          className={classes.button}
        >
          Erode Mask
        </Button>
      </div>
    </div>
  );

  return (
    <div className={classes.root}>
      <CssBaseline />
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            className={classes.menuButton}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>
            Measuring Sperm Cell Length of Fruit Flies
          </Typography>
        </Toolbar>
      </AppBar>
      <nav className={classes.drawer} aria-label="mailbox folders">
        <Hidden smUp implementation="css">
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            classes={{
              paper: classes.drawerPaper,
            }}
            ModalProps={{
              keepMounted: true,
            }}
          >
            {drawer}
          </Drawer>
        </Hidden>
        <Hidden xsDown implementation="css">
          <Drawer
            classes={{
              paper: classes.drawerPaper,
            }}
            variant="permanent"
            open
          >
            {drawer}
          </Drawer>
        </Hidden>
      </nav>
      <main className={classes.content}>
        <div className={classes.toolbar} />
        <div className={classes.buttons}>
          <input
            accept="image/*"
            id="contained-button-file"
            type="file"
            hidden
            onChange={handleFileInput}
          />
          <label htmlFor="contained-button-file">
            <Button
              variant="contained"
              component="span"
              startIcon={<PublishIcon />}
            >
              Upload
            </Button>
          </label>
          <ButtonGroup
            variant="contained"
            color="primary"
            ref={thinAnchorRef}
            disabled={file ? false : true}
            aria-label="thin button"
          >
            <Button onClick={handleThinButton}>{thinOptions[thinIndex]}</Button>
            <Button
              color="primary"
              size="small"
              aria-controls={openThinButton ? "thin-button-menu" : undefined}
              aria-expanded={openThinButton ? "true" : undefined}
              aria-label="select thin option"
              aria-haspopup="menu"
              onClick={handleThinToggle}
            >
              <ArrowDropDownIcon />
            </Button>
          </ButtonGroup>
          <Popper
            open={openThinButton}
            anchorEl={thinAnchorRef.current}
            role={undefined}
            transition
            disablePortal
          >
            {({ TransitionProps, placement }) => (
              <Grow
                {...TransitionProps}
                style={{
                  transformOrigin:
                    placement === "bottom" ? "center top" : "center bottom",
                }}
              >
                <Paper>
                  <ClickAwayListener onClickAway={handleThinClose}>
                    <MenuList id="thin-button-menu">
                      {thinOptions.map((option, index) => (
                        <MenuItem
                          key={option}
                          selected={index === thinIndex}
                          onClick={(event) =>
                            handleThinMenuItemClick(event, index)
                          }
                        >
                          {option}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </ClickAwayListener>
                </Paper>
              </Grow>
            )}
          </Popper>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleLuckyButton}
            disabled={file ? false : true}
          >
            I'M FEELING LUCKY
          </Button>
        </div>
        <Card>
          <CardHeader
            title={
              length
                ? `Visualization (Length: ${length.toFixed(2)} mm)`
                : "Visualization"
            }
          />
          <Divider />
          <CardContent className={classes.cardContent}>
            {!file && (
              <Typography variant="subtitle1">Please select a file</Typography>
            )}
            {file && (
              <div className={classes.imageContainer} ref={imageContainerRef}>
                <canvas className={classes.canvas} ref={canvasRef} />
                <canvas
                  className={classes.mask}
                  ref={maskCanvasRef}
                  onMouseMove={handleMouseMove}
                  onMouseDown={handleMouseDown}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <div className={classes.cursor} ref={brushRef} />
    </div>
  );
}

export default App;
