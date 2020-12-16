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
import Input from "@material-ui/core/Input";
import MenuIcon from "@material-ui/icons/Menu";
import PublishIcon from "@material-ui/icons/Publish";
import Grid from "@material-ui/core/Grid";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import imgToGreyscale from "./utils/imgToGreyscale";
import greyscaleToBin from "./utils/greyscaleToBin";
import binToImg from "./utils/binToImg";
import invert from "./utils/invert";
import {
  dilate,
  erode,
  open,
  close,
  structSquare,
  structCross,
  flood,
  labelComponents,
  getLargestComponents,
} from "./utils/morphology";
import thin from "./utils/thin";
import {
  generateBinaryInputs,
  generateLookupTable,
} from "./utils/thinLookupTable";

const drawerWidth = 240;

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

      "& > *": {
        marginBottom: theme.spacing(2),
      },
    },
    upload: {
      marginBottom: theme.spacing(2),
    },
    mask: {
      position: "absolute",
      top: 0,
      left: 0,
    },
    imageContainer: {
      position: "relative",
    },
    input: {
      width: 42,
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

  const MIN_RGB = 0;
  const MAX_RGB = 255;
  const MIN_ITERATIONS = 0;
  const MAX_ITERATIONS = 10;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(URL.createObjectURL(e.target.files?.[0]));
  };

  const handleUpdateButton = () => {
    updateImage();
  };

  const handleMinThresholdSlider = (
    e: React.ChangeEvent<{}>,
    value: number | number[]
  ) => {
    value = Array.isArray(value) ? value[0] : value;
    setMinThreshold(value);
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

  const updateImage = useCallback(() => {
    if (canvasRef.current && maskCanvasRef.current && imgRef.current) {
      const context = canvasRef.current.getContext("2d");
      const maskContext = maskCanvasRef.current.getContext("2d");
      if (context && maskContext) {
        const width = Math.floor(imgRef.current.width * 0.5);
        const height = Math.floor(imgRef.current.height * 0.5);
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
        let binRep = greyscaleToBin(greyscaleRep, minThreshold, maxThreshold);
        console.log(morphology);
        binRep = close(binRep, structCross, morphology);
        binRep = getLargestComponents(binRep, 2, structSquare);
        binRep = thin(binRep);
        const maskImage = maskContext.createImageData(width, height);
        binToImg(binRep, maskImage.data);
        maskContext.putImageData(maskImage, 0, 0);
      }
    }
  }, [minThreshold, maxThreshold, morphology]);
  useEffect(() => {
    imgRef.current = new Image();
    generateLookupTable();
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
        <div>
          <Typography id="min-threshold-slider" gutterBottom>
            Minimum Threshold
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs>
              <Slider
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
        <div>
          <Typography id="morphology-slider" gutterBottom>
            Morphology Iterations
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs>
              <Slider
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
        >
          Update
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
            className={classes.upload}
          >
            Upload
          </Button>
        </label>
        <div className={classes.imageContainer}>
          {file && (
            <>
              <canvas ref={canvasRef} />
              <canvas className={classes.mask} ref={maskCanvasRef} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
