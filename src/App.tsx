import React, { useEffect, useRef, useState, useCallback } from "react";
import AppBar from "@material-ui/core/AppBar";
import CssBaseline from "@material-ui/core/CssBaseline";
import Divider from "@material-ui/core/Divider";
import Drawer from "@material-ui/core/Drawer";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import Slider from "@material-ui/core/Slider";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Input from "@material-ui/core/Input";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import LinearProgress from "@material-ui/core/LinearProgress";
import MenuIcon from "@material-ui/icons/Menu";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import Grow from "@material-ui/core/Grow";
import Paper from "@material-ui/core/Paper";
import Popper from "@material-ui/core/Popper";
import MenuItem from "@material-ui/core/MenuItem";
import MenuList from "@material-ui/core/MenuList";
import PublishIcon from "@material-ui/icons/Publish";
import Grid from "@material-ui/core/Grid";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import { close, structSquare, getLargestComponents } from "./utils/morphology";
import {
  buildCC,
  thinPixel,
  thinCC,
  ccToBin,
  generateLookupTable,
  ccToGreyscale,
} from "./utils/thin";
import { getLength, invert } from "./utils/tools";
import {
  imgToGreyscale,
  greyscaleToBin,
  greyscaleToBinAdaptive,
  binToImg,
  greyscaleToImg,
} from "./utils/convert";

const drawerWidth = 300;

interface Props {
  children: React.ReactElement;
  open: boolean;
  value: number;
}

function ValueLabelComponent(props: Props) {
  const { children, open, value } = props;

  return (
    <Tooltip open={open} enterTouchDelay={0} placement="top" title={value}>
      {children}
    </Tooltip>
  );
}

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
      padding: theme.spacing(3),
      position: "relative",
      "& > *": {
        marginBottom: theme.spacing(2),
      },
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
    input: {
      width: 42,
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
  const [morphology, setMorphology] = useState<number>(0);
  const [length, setLength] = useState<number>();
  const [maskLoaded, setMaskLoaded] = useState(false);
  const [brush, setBrush] = useState<number>(3);
  const [draw, setDraw] = useState(1);
  const [openThinButton, setOpenThinButton] = React.useState(false);
  const [thinIndex, setThinIndex] = React.useState(0);
  const [openThresholdButton, setOpenThresholdButton] = React.useState(false);
  const [thresholdIndex, setThresholdIndex] = React.useState(0);

  const MIN_RGB = 0;
  const MAX_RGB = 255;
  const MIN_ITERATIONS = 0;
  const MAX_ITERATIONS = 10;
  const SCALE = 0.5;
  const MAX_BRUSH = 200;
  const MIN_BRUSH = 0;
  const thinOptions = ["Cell Complex Thinning", "Serial Thinning"];
  const thresholdOptions = ["Adaptive Threshold", "Simple Threshold"];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lookupRef = useRef<Record<string, boolean> | null>(null);
  const maskBinRef = useRef<number[][] | null>();
  const brushRef = useRef<HTMLDivElement>(null);
  const brushDownRef = useRef(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const thinAnchorRef = React.useRef<HTMLDivElement>(null);
  const thresholdAnchorRef = React.useRef<HTMLDivElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(URL.createObjectURL(e.target.files?.[0]));
  };

  const handleMinThresholdSlider = (
    e: React.ChangeEvent<{}>,
    value: number | number[]
  ) => {
    value = Array.isArray(value) ? value[0] : value;
    setMinThreshold(value);
  };

  const handleThresholdMenuItemClick = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    index: number
  ) => {
    setThresholdIndex(index);
    setOpenThresholdButton(false);
  };

  const handleThresholdToggle = () => {
    setOpenThresholdButton((prev) => !prev);
  };

  const handleThresholdClose = (
    event: React.MouseEvent<Document, MouseEvent>
  ) => {
    if (
      thresholdAnchorRef.current &&
      thresholdAnchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }

    setOpenThresholdButton(false);
  };

  const handleThresholdButton = () => {
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

  const handleMinThresholdInput = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newThreshold = Number(event.target.value);
    if (newThreshold < MIN_RGB) {
      setMinThreshold(MIN_RGB);
    } else if (newThreshold > MAX_RGB) {
      setMinThreshold(MAX_RGB);
    } else {
      setMinThreshold(newThreshold);
    }
  };

  const handleMaxThresholdSlider = (
    e: React.ChangeEvent<{}>,
    value: number | number[]
  ) => {
    value = Array.isArray(value) ? value[0] : value;
    setMaxThreshold(value);
  };

  const handleMaxThresholdInput = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newThreshold = Number(event.target.value);
    if (newThreshold < MIN_RGB) {
      setMaxThreshold(MIN_RGB);
    } else if (newThreshold > MAX_RGB) {
      setMaxThreshold(MAX_RGB);
    } else {
      setMaxThreshold(newThreshold);
    }
  };

  const handleMorphologySlider = (
    e: React.ChangeEvent<{}>,
    value: number | number[]
  ) => {
    value = Array.isArray(value) ? value[0] : value;
    setMorphology(value);
  };

  const handleMorphologyInput = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newMorphology = Number(event.target.value);
    if (newMorphology < MIN_ITERATIONS) {
      setMorphology(MIN_ITERATIONS);
    } else if (newMorphology > MAX_ITERATIONS) {
      setMorphology(MAX_ITERATIONS);
    } else {
      setMorphology(newMorphology);
    }
  };

  const handleBrushSlider = (
    e: React.ChangeEvent<{}>,
    value: number | number[]
  ) => {
    value = Array.isArray(value) ? value[0] : value;
    setBrush(value);
  };

  const handleBrushInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newBrush = Number(event.target.value);
    if (newBrush < MIN_BRUSH) {
      setBrush(MIN_BRUSH);
    } else if (newBrush > MAX_BRUSH) {
      setBrush(MAX_BRUSH);
    } else {
      setBrush(newBrush);
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

  const handleUpdateButton = () => {
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
        maskBinRef.current = close(
          maskBinRef.current,
          structSquare,
          morphology
        );
        const maskImage = maskContext.createImageData(width, height);
        binToImg(maskBinRef.current, maskImage.data);
        maskContext.putImageData(maskImage, 0, 0);
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

  const handleResetButton = () => {
    updateImage();
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

  const updateImage = useCallback(() => {
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
        const greyscaleRep = imgToGreyscale(imagePixels, width, height);
        let binRep = greyscaleToBinAdaptive(greyscaleRep, 10, 7);
        binRep = close(binRep, structSquare, morphology);
        maskBinRef.current = binRep;
        setMaskLoaded(true);
        const maskImage = maskContext.createImageData(width, height);
        binToImg(binRep, maskImage.data);
        maskContext.putImageData(maskImage, 0, 0);
      }
    }
  }, [minThreshold, maxThreshold, morphology]);

  useEffect(() => {
    imgRef.current = new Image();
    lookupRef.current = generateLookupTable();
  }, []);

  useEffect(() => {
    if (imgRef.current) {
      imgRef.current.onload = () => {
        updateImage();
      };
    }
  }, [updateImage]);

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
        <Typography variant="h6">Threshold Options</Typography>
        <div>
          <Typography id="min-threshold-slider" gutterBottom>
            Minimum Threshold
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs>
              <Slider
                disabled={maskLoaded ? false : true}
                ValueLabelComponent={ValueLabelComponent}
                aria-label="minimum threshold"
                onChange={handleMinThresholdSlider}
                value={minThreshold}
                min={MIN_RGB}
                max={MAX_RGB}
              />
            </Grid>
            <Grid item>
              <Input
                disabled={maskLoaded ? false : true}
                className={classes.input}
                value={minThreshold.toString()}
                margin="dense"
                onChange={handleMinThresholdInput}
                inputProps={{
                  min: MIN_RGB,
                  max: MAX_RGB,
                  type: "number",
                  "aria-labelledby": "min-threshold-slider",
                }}
              />
            </Grid>
          </Grid>
        </div>
        <div>
          <Typography id="max-threshold-slider" gutterBottom>
            Maximum Threshold
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs>
              <Slider
                disabled={maskLoaded ? false : true}
                ValueLabelComponent={ValueLabelComponent}
                aria-label="maximum threshold"
                onChange={handleMaxThresholdSlider}
                value={maxThreshold}
                min={MIN_RGB}
                max={MAX_RGB}
              />
            </Grid>
            <Grid item>
              <Input
                disabled={maskLoaded ? false : true}
                className={classes.input}
                value={maxThreshold.toString()}
                margin="dense"
                onChange={handleMaxThresholdInput}
                inputProps={{
                  min: MIN_RGB,
                  max: MAX_RGB,
                  type: "number",
                  "aria-labelledby": "min-threshold-slider",
                }}
              />
            </Grid>
          </Grid>
        </div>
        <Button
          variant="contained"
          color="primary"
          onClick={handleResetButton}
          disabled={maskLoaded ? false : true}
        >
          Reset Mask
        </Button>
        <Button
          variant="outlined"
          onClick={handleClearButton}
          disabled={maskLoaded ? false : true}
        >
          Clear mask
        </Button>
        <Typography variant="h6" className={classes.menuTitle}>
          Mask Tools
        </Typography>
        <div>
          <Typography id="brush-slider" gutterBottom>
            Brush Radius
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs>
              <Slider
                disabled={maskLoaded ? false : true}
                ValueLabelComponent={ValueLabelComponent}
                aria-label="brush radius"
                onChange={handleBrushSlider}
                value={brush}
                min={MIN_BRUSH}
                max={MAX_BRUSH}
              />
            </Grid>
            <Grid item>
              <Input
                disabled={maskLoaded ? false : true}
                className={classes.input}
                value={brush.toString()}
                margin="dense"
                onChange={handleBrushInput}
                inputProps={{
                  min: MIN_BRUSH,
                  max: MAX_BRUSH,
                  type: "number",
                  "aria-labelledby": "brush-slider",
                }}
              />
            </Grid>
          </Grid>
        </div>
        <ButtonGroup
          color="primary"
          aria-label="mask tools"
          disabled={maskLoaded ? false : true}
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
          disabled={maskLoaded ? false : true}
        >
          Invert Mask
        </Button>
        <Typography variant="h6" className={classes.menuTitle}>
          Mask Morphology
        </Typography>
        <div>
          <Typography id="morphology-slider" gutterBottom>
            Close Iterations
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs>
              <Slider
                disabled={maskLoaded ? false : true}
                ValueLabelComponent={ValueLabelComponent}
                aria-label="custom thumb label"
                onChange={handleMorphologySlider}
                value={morphology}
                min={MIN_ITERATIONS}
                max={MAX_ITERATIONS}
              />
            </Grid>
            <Grid item>
              <Input
                disabled={maskLoaded ? false : true}
                className={classes.input}
                value={morphology.toString()}
                margin="dense"
                onChange={handleMorphologyInput}
                inputProps={{
                  min: MIN_ITERATIONS,
                  max: MAX_ITERATIONS,
                  type: "number",
                  "aria-labelledby": "morphology-slider",
                }}
              />
            </Grid>
          </Grid>
        </div>
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpdateButton}
          disabled={maskLoaded ? false : true}
        >
          Update Mask
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
            disabled={maskLoaded ? false : true}
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
          <ButtonGroup
            variant="contained"
            color="primary"
            ref={thresholdAnchorRef}
            disabled={maskLoaded ? false : true}
            aria-label="threshold button"
          >
            <Button onClick={handleThresholdButton}>
              {thresholdOptions[thresholdIndex]}
            </Button>
            <Button
              color="primary"
              size="small"
              aria-controls={
                openThresholdButton ? "threshold-button-menu" : undefined
              }
              aria-expanded={openThresholdButton ? "true" : undefined}
              aria-label="select threshold option"
              aria-haspopup="menu"
              onClick={handleThresholdToggle}
            >
              <ArrowDropDownIcon />
            </Button>
          </ButtonGroup>
          <Popper
            open={openThresholdButton}
            anchorEl={thresholdAnchorRef.current}
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
                  <ClickAwayListener onClickAway={handleThresholdClose}>
                    <MenuList id="threshold-button-menu">
                      {thresholdOptions.map((option, index) => (
                        <MenuItem
                          key={option}
                          selected={index === thresholdIndex}
                          onClick={(event) =>
                            handleThresholdMenuItemClick(event, index)
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
            disabled={maskLoaded ? false : true}
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
            {!file && !maskLoaded && (
              <Typography variant="subtitle1">Please select a file</Typography>
            )}
            {file && !maskLoaded && (
              <LinearProgress className={classes.progress} />
            )}
            {file && (
              <div
                className={classes.imageContainer}
                style={{ display: maskLoaded ? "block" : "none" }}
                ref={imageContainerRef}
              >
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
