import {
  Button,
  Dialog,
  EnumButtonStyle,
  EnumFlexDirection,
  EnumGapSize,
  EnumItemsAlign,
  FlexItem,
  MultiStateToggle,
  SelectMenu,
  SelectMenuList,
  SelectMenuModal,
  TextField,
} from "@amplication/ui/design-system";
import { Form, Formik } from "formik";
import { useCallback, useContext, useRef, useState } from "react";
import { GlobalHotKeys } from "react-hotkeys";
import { useHistory } from "react-router-dom";
import { AppContext } from "../context/appContext";
import { EnumCommitStrategy, EnumResourceType } from "../models";
import { useTracking } from "../util/analytics";
import { AnalyticsEventNames } from "../util/analytics-events.types";
import { CROSS_OS_CTRL_ENTER } from "../util/hotkeys";
import "./Commit.scss";
import useAvailableCodeGenerators from "../Workspaces/hooks/useAvailableCodeGenerators";
import useCommits from "./hooks/useCommits";
import CreateCommitStrategyButtonItem from "./CreateCommitStrategyButtonItem";
import "./CreateCommitStrategyButton.scss";
import usePendingChanges from "../Workspaces/hooks/usePendingChanges";
import CommitButton from "./CommitButton";
import ResourceCircleBadge from "../Components/ResourceCircleBadge";

const OPTIONS = [
  {
    label: ".NET",
    value: "dotnet",
  },
  {
    label: "Node.js",
    value: "node",
  },
];

export type TCommit = {
  message: string;
  commitStrategy: EnumCommitStrategy;
  selectedService: string;
};

const INITIAL_VALUES: TCommit = {
  message: "",
  commitStrategy: EnumCommitStrategy.All,
  selectedService: null,
};

type Props = {
  projectId: string;
  noChanges: boolean;
  showCommitMessage?: boolean;
  commitMessage?: string;
  commitBtnType: CommitBtnType;
};
const CLASS_NAME = "commit";

const keyMap = {
  SUBMIT: CROSS_OS_CTRL_ENTER,
};

export enum CommitBtnType {
  Button = "button",
  JumboButton = "jumboButton",
}

export type commitStrategyOption = {
  strategyType: EnumCommitStrategy;
  label: string;
};

const COMMIT_STRATEGY_OPTIONS: commitStrategyOption[] = [
  {
    strategyType: EnumCommitStrategy.All,
    label: "All services",
  },
  {
    strategyType: EnumCommitStrategy.AllWithPendingChanges,
    label: "Pending changes",
  },
  {
    strategyType: EnumCommitStrategy.Specific,
    label: "Specific service",
  },
];

const Commit = ({
  projectId,
  noChanges,
  commitBtnType,
  showCommitMessage = true,
}: Props) => {
  const history = useHistory();
  const { trackEvent } = useTracking();
  const formikRef = useRef(null);

  const { dotNetGeneratorEnabled } = useAvailableCodeGenerators();

  const { currentWorkspace, currentProject, resources } =
    useContext(AppContext);

  const [specificServiceSelected, setSpecificServiceSelected] =
    useState<boolean>();

  const { commitChangesLoading, commitChanges, bypassLimitations } =
    useCommits(projectId);
  const { pendingChanges } = usePendingChanges(currentProject);

  const handleSubmit = useCallback((data, { resetForm }) => {
    resetForm(INITIAL_VALUES);
  }, []);

  const handleCommitBtnClicked = useCallback(() => {
    formikRef.current.submitForm();
  }, []);

  const handleOnSelectLanguageChange = useCallback(
    (selectedValue: string) => {
      if (selectedValue === "dotnet") {
        trackEvent({
          eventName: AnalyticsEventNames.ChangedToDotNet,
          workspaceId: currentWorkspace.id,
        });
        history.push(
          `/${currentWorkspace?.id}/${currentProject?.id}/dotnet-upgrade`
        );
      }
    },
    [currentProject?.id, currentWorkspace?.id, history, trackEvent]
  );

  const handleSpecificServiceSelectedDismiss = useCallback(() => {
    setSpecificServiceSelected(false);
  }, [setSpecificServiceSelected]);

  const handleCommit = useCallback(
    (
      message: string,
      commitStrategy: EnumCommitStrategy,
      selectedServiceId?: string
    ) => {
      commitChanges({
        message: message,
        project: { connect: { id: currentProject?.id } },
        bypassLimitations: bypassLimitations ?? false,
        commitStrategy: commitStrategy,
        resourceIds: selectedServiceId ? [selectedServiceId] : null,
      });

      formikRef.current.submitForm();
    },
    [bypassLimitations, commitChanges, currentProject?.id]
  );

  const handleOnSpecificServiceCommit = useCallback(
    (serviceId: string) => {
      handleCommit(
        formikRef.current?.values?.message,
        EnumCommitStrategy.Specific,
        serviceId
      );
      handleSpecificServiceSelectedDismiss();
    },
    [handleCommit, handleSpecificServiceSelectedDismiss]
  );

  const handleOnSelectCommitStrategyChange = useCallback(
    (selectedValue) => {
      formikRef.current.values.commitStrategy = selectedValue.strategyType;
      if (selectedValue.strategyType === EnumCommitStrategy.Specific) {
        setSpecificServiceSelected(true);
        return;
      }

      handleCommit(
        formikRef.current?.values?.message,
        formikRef.current?.values?.commitStrategy,
        null
      );
    },
    [handleCommit]
  );

  return (
    <>
      <Dialog
        title="Please Select a service to generate"
        isOpen={specificServiceSelected}
        onDismiss={handleSpecificServiceSelectedDismiss}
      >
        <FlexItem
          direction={EnumFlexDirection.Column}
          itemsAlign={EnumItemsAlign.Start}
        >
          {resources
            .filter((r) => r.resourceType === EnumResourceType.Service)
            .map((resource, index) => (
              <Button
                buttonStyle={EnumButtonStyle.Text}
                onClick={() => {
                  handleOnSpecificServiceCommit(resource.id);
                }}
              >
                <FlexItem direction={EnumFlexDirection.Row}>
                  <ResourceCircleBadge
                    type={EnumResourceType.Service}
                    size="small"
                  />
                  {resource.name}
                </FlexItem>
              </Button>
            ))}
        </FlexItem>
      </Dialog>
      <div className={CLASS_NAME}>
        <Formik
          initialValues={INITIAL_VALUES}
          onSubmit={handleSubmit}
          validateOnMount
          innerRef={formikRef}
        >
          {(formik) => {
            const handlers = {
              SUBMIT: formik.submitForm,
            };

            return (
              <Form>
                {!commitChangesLoading && (
                  <GlobalHotKeys keyMap={keyMap} handlers={handlers} />
                )}
                {showCommitMessage && (
                  <TextField
                    rows={3}
                    textarea
                    name="message"
                    label={noChanges ? "Build message" : "Commit message..."}
                    disabled={commitChangesLoading}
                    autoFocus
                    hideLabel
                    placeholder={
                      noChanges ? "Build message" : "Commit message..."
                    }
                    autoComplete="off"
                  />
                )}
                {!dotNetGeneratorEnabled && (
                  <MultiStateToggle
                    className={`${CLASS_NAME}__technology-toggle`}
                    label=""
                    name="action_"
                    options={OPTIONS}
                    onChange={handleOnSelectLanguageChange}
                    selectedValue={"node"}
                  />
                )}
                <div>
                  <FlexItem
                    direction={EnumFlexDirection.Row}
                    itemsAlign={EnumItemsAlign.Center}
                    gap={EnumGapSize.None}
                  >
                    <CommitButton
                      commitMessage={formikRef.current?.values?.message}
                      onCommitChanges={handleCommitBtnClicked}
                    ></CommitButton>
                    <SelectMenu
                      title=""
                      icon="chevron_down"
                      buttonStyle={EnumButtonStyle.Text}
                      className={`${CLASS_NAME}__commit-strategy`}
                    >
                      <SelectMenuModal align="right" withCaret>
                        <SelectMenuList>
                          {COMMIT_STRATEGY_OPTIONS.map((item, index) => (
                            <CreateCommitStrategyButtonItem
                              key={index}
                              item={item}
                              hasPendingChanges={pendingChanges?.length > 0}
                              onCommitStrategySelected={
                                handleOnSelectCommitStrategyChange
                              }
                            ></CreateCommitStrategyButtonItem>
                          ))}
                        </SelectMenuList>
                      </SelectMenuModal>
                    </SelectMenu>
                  </FlexItem>
                </div>
              </Form>
            );
          }}
        </Formik>
      </div>
    </>
  );
};

export default Commit;
