import React, { useState, useEffect } from "react";
import {
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  Button,
  IconButton,
  FormGroup,
  FormLabel,
  styled,
} from "@mui/material";
import { capitalizeFirstLetterOfEachWord } from "./Addresses/utils";
import BasicCardGroup from "./BasicCardGroup";
import ClearIcon from "@mui/icons-material/Clear";

const StyledContainer = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  width: "100%",
  maxWidth: 900,
  justifyContent: "space-between",
  flexWrap: "wrap",
  [theme.breakpoints.down("sm")]: {
    border: "solid 1px #E8E8E8",
    borderRadius: "16px",
    justifyContent: "flex-start",
  },
}));

// Assuming the data is imported from a JSON file.
import guides from "../../guides.json";

interface IGuide {
  label: string;
  link: string;
  tooltip: string;
  language?: string;
  tags?: string | Array<string>;
  chain?: string | Array<string>;
}
interface GuideJson {
  chains: Array<string>;
  languages: Array<string>;
  categories: Array<string>;
  guides: Array<IGuide>;
}

const ALL_GUIDES = guides.chains ?? [];
const ALL_CHAINS = guides.chains ?? [];
const ALL_TAGS = guides.categories ?? [];
const ALL_LANGUAGES = guides.languages ?? [];

interface FilteredGuides {
  sections: {
    title: string;
    description?: string;
    guides: IGuide[];
  }[];
}

const getChainGuides = (chain: string): IGuide[] => {
  return (guides.guides as IGuide[]).filter(
    (g) =>
      g.chain &&
      (Array.isArray(g.chain) ? g.chain.includes(chain) : g.chain === chain)
  );
};

const getCategoryGuides = (category: string): IGuide[] => {
  return (guides.guides as IGuide[]).filter(
    (g) =>
      g.tags &&
      (Array.isArray(g.tags) ? g.tags.includes(category) : g.tags === category)
  );
};

const assertChainGuide = (guide: IGuide, chain: string): boolean => {
  return Array.isArray(guide.chain)
    ? guide.chain.includes(chain)
    : guide.chain === chain;
};

const assertCategoryGuide = (guide: IGuide, category: string): boolean => {
  return (
    guide.tags &&
    (Array.isArray(guide.tags)
      ? guide.tags.includes(category)
      : guide.tags === category)
  );
};

const DEFAULT_FILTERED_GUIDES: FilteredGuides = {
  sections: [
    {
      title: "General",
      description: "",
      guides: (guides.guides as IGuide[]).filter((g) => g.chain === undefined),
    },
    {
      title: "Solana",
      description: "",
      guides: getChainGuides("solana"),
    },
    {
      title: "EVM",
      description: "",
      guides: getChainGuides("evm"),
    },
  ],
};

const getGuides = (
  selectedChains: string[],
  selectedCategories: string[]
): FilteredGuides => {
  if (selectedChains.length === 0 && selectedCategories.length === 0) {
    return DEFAULT_FILTERED_GUIDES;
  }

  const filteredData: FilteredGuides = { sections: [] };
  if (selectedChains.length === 0) {
    filteredData.sections.push(...DEFAULT_FILTERED_GUIDES.sections);
  } else {
    filteredData.sections.push(DEFAULT_FILTERED_GUIDES.sections[0]);
    for (const chain of selectedChains) {
      const chainGuides = getChainGuides(chain);
      if (chainGuides.length > 0) {
        filteredData.sections.push({
          title: chain,
          description: "",
          guides: getChainGuides(chain),
        });
      }
    }
  }

  if (selectedCategories.length > 0) {
    for (const [i, section] of filteredData.sections.entries()) {
      filteredData.sections[i] = {
        ...section,
        guides: section.guides.filter(
          (g) =>
            g.tags &&
            (Array.isArray(g.tags)
              ? g.tags.filter((value) => selectedCategories.includes(value))
                  .length > 0
              : selectedCategories.includes(g.tags))
        ),
      };
    }
  }

  return filteredData;
};

export default function GuidesComponent() {
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [filteredData, setFilteredData] = useState<FilteredGuides>(
    getGuides(selectedChains, selectedCategories)
  );

  useEffect(() => {
    setFilteredData(getGuides(selectedChains, selectedCategories));
  }, [selectedChains, selectedCategories]);

  const clearAllFilters = () => {
    setSelectedChains([]);
    setSelectedCategories([]);
  };

  return (
    <div>
      <Grid container justifyContent="space-between" alignItems="center">
        <Grid item xs={4}>
          <StyledContainer>
            <FormLabel component="legend">Categories</FormLabel>
            <Grid
              container
              direction={"row"}
              justifyContent="space-evenly"
              alignItems="center"
            >
              {ALL_TAGS.map((category) => (
                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedCategories.includes(category)}
                        />
                      }
                      label={capitalizeFirstLetterOfEachWord(category)}
                      onChange={() => {
                        setSelectedCategories((prev) =>
                          prev.includes(category)
                            ? prev.filter((c) => c !== category)
                            : [...prev, category]
                        );
                      }}
                    />
                  </FormGroup>
                </Grid>
              ))}
              <Grid item xs={12}>
                <IconButton
                  onClick={() => {
                    setSelectedCategories([]);
                  }}
                  aria-label="clear-chains-filter"
                >
                  <ClearIcon />
                  &nbsp;<span style={{ fontSize: "1.1rem" }}>Clear</span>
                </IconButton>
              </Grid>
            </Grid>
          </StyledContainer>
        </Grid>
        <Divider orientation="vertical" flexItem />
        <Grid item xs={7}>
          <StyledContainer>
            <FormLabel component="legend">Chains</FormLabel>
            <Grid
              container
              direction={"row"}
              justifyContent="space-evenly"
              alignItems="flex-start"
            >
              {ALL_CHAINS.map((chain) => (
                <Grid item xs={12} sm={6} md={4}>
                  <FormGroup>
                    <FormControlLabel
                      className={`navbar_icon__${
                        chain === "evm" ? "solidity" : chain
                      }`}
                      control={
                        <Checkbox checked={selectedChains.includes(chain)} />
                      }
                      label={capitalizeFirstLetterOfEachWord(chain)}
                      onChange={() => {
                        setSelectedChains((prev) =>
                          prev.includes(chain)
                            ? prev.filter((c) => c !== chain)
                            : [...prev, chain]
                        );
                      }}
                    />
                  </FormGroup>
                </Grid>
              ))}
              <Grid item xs={12} md={12}>
                <IconButton
                  onClick={() => {
                    setSelectedChains([]);
                  }}
                  aria-label="clear-chains-filter"
                >
                  <ClearIcon />
                  &nbsp;<span style={{ fontSize: "1.1rem" }}>Clear</span>
                </IconButton>
              </Grid>
            </Grid>
          </StyledContainer>
        </Grid>
      </Grid>

      <hr />

      {filteredData.sections.length === 0 ? (
        <>
          <p style={{ fontSize: "1.25rem" }}>No guides found</p>

          <Button
            variant="contained"
            size="medium"
            onClick={() => {
              clearAllFilters();
            }}
          >
            Clear Filters
          </Button>
        </>
      ) : (
        <>
          {filteredData.sections.map((s) => (
            <BasicCardGroup
              title={capitalizeFirstLetterOfEachWord(s.title)}
              items={s.guides.map((g) => {
                return {
                  label: g.label,
                  link: g.link,
                };
              })}
            />
          ))}
        </>
      )}
    </div>
  );
}
