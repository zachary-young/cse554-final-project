import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import Slider from "@material-ui/core/Slider";
import Input from "@material-ui/core/Input";
import Tooltip from "@material-ui/core/Tooltip";
import { makeStyles, Theme, createStyles } from "@material-ui/core";

interface ValueLabelComponentProps {
  children: React.ReactElement;
  open: boolean;
  value: number;
}

function ValueLabelComponent(props: ValueLabelComponentProps) {
  const { children, open, value } = props;

  return (
    <Tooltip open={open} enterTouchDelay={0} placement="top" title={value}>
      {children}
    </Tooltip>
  );
}

interface ModifiedSliderProps {
  title: string;
  min: number;
  max: number;
  id: string;
  disabled: boolean;
  current: number;
  setCurrent: React.Dispatch<React.SetStateAction<number>>;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    input: {
      width: 42,
    },
  })
);

const ModifiedSlider = ({
  title,
  min,
  max,
  id,
  disabled,
  current,
  setCurrent,
}: ModifiedSliderProps) => {
  const classes = useStyles();
  const handleSlider = (e: React.ChangeEvent<{}>, value: number | number[]) => {
    value = Array.isArray(value) ? value[0] : value;
    setCurrent(value);
  };

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (next < min) {
      setCurrent(min);
    } else if (next > max) {
      setCurrent(max);
    } else {
      setCurrent(next);
    }
  };

  return (
    <div>
      <Typography id={id} gutterBottom>
        {title}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs>
          <Slider
            disabled={disabled}
            ValueLabelComponent={ValueLabelComponent}
            aria-label="maximum threshold"
            onChange={handleSlider}
            value={current}
            min={min}
            max={max}
          />
        </Grid>
        <Grid item>
          <Input
            disabled={disabled}
            className={classes.input}
            value={current.toString()}
            margin="dense"
            onChange={handleInput}
            inputProps={{
              min: min,
              max: max,
              type: "number",
              "aria-labelledby": id,
            }}
          />
        </Grid>
      </Grid>
    </div>
  );
};

export default ModifiedSlider;
